/*
 * CloudCord Installer
 * Copyright (c) 2026 xohus and CloudCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * Code-only WPF (no XAML) so it builds with the C# compiler that ships with
 * Windows (.NET Framework 4.8, C# 5). See build.sh.
 */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Effects;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using IOPath = System.IO.Path;

namespace CloudCord.Installer
{
    public class DiscordBuild
    {
        public string Name;
        public string Folder;   // %LOCALAPPDATA%\Discord etc.
        public string Exe;      // Discord.exe etc.

        public string LatestAppDir()
        {
            if (!Directory.Exists(Folder)) return null;
            return Directory.GetDirectories(Folder, "app-*")
                .OrderByDescending(d => ParseVersion(IOPath.GetFileName(d).Substring(4)))
                .FirstOrDefault();
        }

        static Version ParseVersion(string s)
        {
            Version v;
            return Version.TryParse(s, out v) ? v : new Version(0, 0);
        }

        public string Resources
        {
            get { var app = LatestAppDir(); return app == null ? null : IOPath.Combine(app, "resources"); }
        }

        public bool Exists { get { return Resources != null && Directory.Exists(Resources); } }

        // CloudCord's patched app.asar is a tiny loader; Discord's real one is many megabytes.
        static bool IsLoader(string file)
        {
            return File.Exists(file) && new FileInfo(file).Length < 64 * 1024;
        }

        public bool IsInstalled
        {
            get
            {
                if (!Exists) return false;
                var asar = IOPath.Combine(Resources, "app.asar");
                return IsLoader(asar) && File.ReadAllText(asar).IndexOf("CloudCord", StringComparison.OrdinalIgnoreCase) >= 0;
            }
        }
    }

    public static class Core
    {
        // Same layout as the CloudCord installer for Linux and macOS, so the in-app updater keeps working.
        static readonly string DataDir = IOPath.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "CloudCord");
        public static readonly string AsarPath = IOPath.Combine(DataDir, "cloudcord.asar");
        const string ReleaseApi = "https://api.github.com/repos/cloudcord-mod/release-hub/releases/latest";

        public static List<DiscordBuild> FindBuilds()
        {
            var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            return new List<DiscordBuild> {
                new DiscordBuild { Name = "Discord", Folder = IOPath.Combine(local, "Discord"), Exe = "Discord.exe" },
                new DiscordBuild { Name = "Discord PTB", Folder = IOPath.Combine(local, "DiscordPTB"), Exe = "DiscordPTB.exe" },
                new DiscordBuild { Name = "Discord Canary", Folder = IOPath.Combine(local, "DiscordCanary"), Exe = "DiscordCanary.exe" },
            };
        }

        static System.Net.WebClient Client()
        {
            System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
            var c = new System.Net.WebClient();
            c.Headers.Add("User-Agent", "CloudCord-Installer");
            return c;
        }

        static string releaseJson;

        static string ReleaseJson()
        {
            if (releaseJson == null) using (var c = Client()) releaseJson = c.DownloadString(ReleaseApi);
            return releaseJson;
        }

        /// The version about to be installed, e.g. "build 5547dff · Nov 6", or null if offline.
        public static string LatestVersion()
        {
            try
            {
                var json = ReleaseJson();
                var name = System.Text.RegularExpressions.Regex.Match(json, "\"name\"\\s*:\\s*\"CloudCord Desktop ([0-9a-f]{7,40})\"");
                var date = System.Text.RegularExpressions.Regex.Match(json, "\"published_at\"\\s*:\\s*\"([^\"]+)\"");
                var text = name.Success ? "build " + name.Groups[1].Value.Substring(0, 7) : "latest build";
                DateTime when;
                if (date.Success && DateTime.TryParse(date.Groups[1].Value, out when)) text += " · " + when.ToString("MMM d");
                return text;
            }
            catch { return null; }
        }

        /// Downloads the newest CloudCord build from GitHub Releases into place,
        /// reporting (bytesSoFar, totalBytes) as it goes.
        public static void WriteDist(Action<long, long> progress)
        {
            Directory.CreateDirectory(DataDir);
            var m = System.Text.RegularExpressions.Regex.Match(ReleaseJson(),
                "\"name\"\\s*:\\s*\"(?:desktop|cloudcord)\\.asar\"[\\s\\S]*?\"browser_download_url\"\\s*:\\s*\"([^\"]+)\"");
            if (!m.Success) throw new Exception("The latest CloudCord release has no desktop build yet. Try again later.");

            // Download next to it, then swap, so Discord never sees a half-written file.
            var tmp = AsarPath + ".new";
            System.Net.ServicePointManager.SecurityProtocol |= System.Net.SecurityProtocolType.Tls12;
            var req = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(m.Groups[1].Value);
            req.UserAgent = "CloudCord-Installer";
            using (var res = req.GetResponse())
            using (var src = res.GetResponseStream())
            using (var dst = File.Create(tmp))
            {
                var total = res.ContentLength;
                var buf = new byte[81920];
                long done = 0;
                int read;
                while ((read = src.Read(buf, 0, buf.Length)) > 0)
                {
                    dst.Write(buf, 0, read);
                    done += read;
                    progress(done, total);
                }
            }
            if (new FileInfo(tmp).Length < 100 * 1024) { File.Delete(tmp); throw new Exception("The CloudCord download was incomplete. Check your connection and try again."); }
            if (File.Exists(AsarPath)) File.Replace(tmp, AsarPath, null);
            else File.Move(tmp, AsarPath);
        }

        public static void KillDiscord(DiscordBuild b)
        {
            // Discord's Update.exe can relaunch it, so stop that too and repeat until nothing is left.
            var name = IOPath.GetFileNameWithoutExtension(b.Exe);
            var update = IOPath.Combine(b.Folder, "Update.exe");
            for (var round = 0; round < 20; round++)
            {
                var procs = Process.GetProcessesByName(name).ToList();
                foreach (var u in Process.GetProcessesByName("Update"))
                {
                    try { if (string.Equals(u.MainModule.FileName, update, StringComparison.OrdinalIgnoreCase)) procs.Add(u); } catch { }
                }
                if (procs.Count == 0) return;
                foreach (var p in procs) { try { p.Kill(); } catch { } }
                foreach (var p in procs) { try { p.WaitForExit(1500); } catch { } }
                System.Threading.Thread.Sleep(250);
            }
        }

        /// Writes the tiny loader app.asar, in the same format as the Go installer.
        /// If CloudCord fails to load, it starts plain Discord instead of a crash dialog.
        static void WriteLoaderAsar(string outFile)
        {
            var target = AsarPath.Replace('\\', '/');
            var index =
                "// CloudCord\n" +
                "try { require(\"" + target + "\"); }\n" +
                "catch (e) {\n" +
                "    console.error(\"[CloudCord] failed to load, starting Discord without it\", e);\n" +
                "    const asar = require(\"path\").join(__dirname, \"..\", \"_app.asar\");\n" +
                "    require(\"electron\").app.setAppPath(asar);\n" +
                "    require(asar);\n" +
                "}\n";
            var pkg = "{\"name\":\"discord\",\"main\":\"index.js\"}";
            var enc = new System.Text.UTF8Encoding(false);
            int indexLen = enc.GetByteCount(index), pkgLen = enc.GetByteCount(pkg);
            var header = "{\"files\":{\"index.js\":{\"size\":" + indexLen + ",\"offset\":\"0\"},\"package.json\":{\"size\":" + pkgLen + ",\"offset\":\"" + indexLen + "\"}}}";
            uint headerLen = (uint)enc.GetByteCount(header), dataSize = 4;
            uint aligned = (headerLen + dataSize - 1) & ~(dataSize - 1);
            header += new string('0', (int)(aligned - headerLen));
            using (var f = new BinaryWriter(File.Create(outFile)))
            {
                f.Write((int)dataSize); f.Write((int)(aligned + 8)); f.Write((int)(aligned + dataSize)); f.Write((int)headerLen);
                f.Write(enc.GetBytes(header)); f.Write(enc.GetBytes(index)); f.Write(enc.GetBytes(pkg));
            }
        }

        public static void Inject(DiscordBuild b)
        {
            var res = b.Resources;
            var asar = IOPath.Combine(res, "app.asar");
            var backup = IOPath.Combine(res, "_app.asar");

            // A real app.asar means a fresh Discord (or one Discord updated): back it up.
            if (File.Exists(asar) && !IsLoaderFile(asar))
            {
                if (File.Exists(backup)) File.Delete(backup);
                File.Move(asar, backup);
            }
            if (!File.Exists(backup)) throw new Exception(b.Name + " looks damaged: app.asar is missing. Reinstall Discord and try again.");

            // Another mod's loader folder would win over app.asar, so it has to go.
            var appDir = IOPath.Combine(res, "app");
            if (Directory.Exists(appDir)) Directory.Delete(appDir, true);

            var tmp = asar + ".new";
            WriteLoaderAsar(tmp);
            if (File.Exists(asar)) File.Delete(asar);
            File.Move(tmp, asar);
        }

        static bool IsLoaderFile(string file) { return File.Exists(file) && new FileInfo(file).Length < 64 * 1024; }

        public static void Remove(DiscordBuild b)
        {
            var res = b.Resources;
            var asar = IOPath.Combine(res, "app.asar");
            var backup = IOPath.Combine(res, "_app.asar");
            if (!File.Exists(backup)) return;
            if (IsLoaderFile(asar)) File.Delete(asar);
            if (!File.Exists(asar)) File.Move(backup, asar);
        }

        public static void Launch(DiscordBuild b)
        {
            var update = IOPath.Combine(b.Folder, "Update.exe");
            if (File.Exists(update))
                Process.Start(new ProcessStartInfo(update, "--processStart " + b.Exe) { UseShellExecute = false });
        }
    }

    public enum StepState { Pending, Running, Done, Failed }

    /// One line of the install checklist with an animated state indicator.
    public class StepRow
    {
        static readonly Color Accent = Color.FromRgb(74, 168, 255);
        static readonly Color Green = Color.FromRgb(87, 242, 135);
        static readonly Color Red = Color.FromRgb(242, 63, 67);

        public readonly Grid Root = new Grid { Margin = new Thickness(0, 0, 0, 10), Opacity = 0.45 };
        readonly Grid icon = new Grid { Width = 24, Height = 24, Margin = new Thickness(0, 0, 14, 0) };
        readonly TextBlock text, detail;
        StepState state = StepState.Pending;

        public StepRow(string name)
        {
            Root.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            Root.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            text = new TextBlock { Text = name, FontSize = 15, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis };
            detail = new TextBlock { FontSize = 13, Foreground = new SolidColorBrush(Color.FromRgb(160, 160, 180)), VerticalAlignment = VerticalAlignment.Center };
            Grid.SetColumn(icon, 0); Grid.SetColumn(text, 1); Grid.SetColumn(detail, 2);
            Root.Children.Add(icon); Root.Children.Add(text); Root.Children.Add(detail);
            DrawPending();
        }

        void DrawPending()
        {
            icon.Children.Clear();
            icon.Children.Add(new Ellipse { Stroke = new SolidColorBrush(Color.FromArgb(110, 255, 255, 255)), StrokeThickness = 2 });
        }

        public void Set(StepState next, string detailText)
        {
            detail.Text = detailText ?? "";
            if (next == state) return;
            state = next;
            Root.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(next == StepState.Pending ? 0.45 : 1, TimeSpan.FromMilliseconds(250)));
            icon.Children.Clear();

            if (next == StepState.Running)
            {
                icon.Children.Add(new Ellipse { Stroke = new SolidColorBrush(Color.FromArgb(50, 255, 255, 255)), StrokeThickness = 2.5 });
                var arc = new System.Windows.Shapes.Path
                {
                    Data = Geometry.Parse("M 12,1.5 A 10.5,10.5 0 0 1 22.5,12"),
                    Stroke = new SolidColorBrush(Accent), StrokeThickness = 2.5,
                    StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round,
                    RenderTransformOrigin = new Point(0.5, 0.5),
                };
                var spin = new RotateTransform();
                arc.RenderTransform = spin;
                spin.BeginAnimation(RotateTransform.AngleProperty, new DoubleAnimation(0, 360, TimeSpan.FromSeconds(0.9)) { RepeatBehavior = RepeatBehavior.Forever });
                icon.Children.Add(arc);
                return;
            }

            if (next == StepState.Pending) { DrawPending(); return; }

            var done = next == StepState.Done;
            var circle = new Ellipse { Fill = new SolidColorBrush(done ? Green : Red) };
            var mark = new System.Windows.Shapes.Path
            {
                Data = Geometry.Parse(done ? "M 7,12.5 L 10.5,16 L 17,8.5" : "M 8,8 L 16,16 M 16,8 L 8,16"),
                Stroke = new SolidColorBrush(Color.FromRgb(16, 12, 30)), StrokeThickness = 2.6,
                StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, StrokeLineJoin = PenLineJoin.Round,
            };
            icon.Children.Add(circle); icon.Children.Add(mark);
            var pop = new ScaleTransform(0.4, 0.4);
            icon.RenderTransformOrigin = new Point(0.5, 0.5);
            icon.RenderTransform = pop;
            var back = new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.6 };
            pop.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(0.4, 1, TimeSpan.FromMilliseconds(380)) { EasingFunction = back });
            pop.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(0.4, 1, TimeSpan.FromMilliseconds(380)) { EasingFunction = back });
        }
    }

    public class App : Application
    {
        [STAThread]
        public static void Main()
        {
            var app = new App();
            app.Run(new MainWindow());
        }
    }

    public class MainWindow : Window
    {
        static readonly Color Accent = Color.FromRgb(74, 168, 255);
        static readonly Color Accent2 = Color.FromRgb(45, 107, 255);
        static readonly Brush TextBrush = new SolidColorBrush(Color.FromRgb(240, 245, 255));
        static readonly Brush MutedBrush = new SolidColorBrush(Color.FromRgb(150, 168, 200));
        static readonly FontFamily Font = new FontFamily("Segoe UI Variable Display, Segoe UI");

        readonly Grid root = new Grid();
        readonly Grid content = new Grid();
        readonly List<DiscordBuild> builds = Core.FindBuilds();
        readonly Dictionary<DiscordBuild, CheckBox> picks = new Dictionary<DiscordBuild, CheckBox>();
        Image logo;
        StackPanel brand;
        Border sky;
        System.Windows.Shapes.Path ring;
        TextBlock skySub, skyPercent;

        public MainWindow()
        {
            Title = "CloudCord Installer";
            Width = 860; Height = 540;
            WindowStyle = WindowStyle.None;
            AllowsTransparency = true;
            ResizeMode = ResizeMode.NoResize;
            Background = Brushes.Transparent;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;
            FontFamily = Font;
            Icon = LoadImage("logo.png");

            var frame = new Border
            {
                Margin = new Thickness(20),
                CornerRadius = new CornerRadius(22),
                ClipToBounds = true,
                Background = new LinearGradientBrush(Color.FromRgb(12, 22, 48), Color.FromRgb(6, 10, 24), 90),
                Effect = new DropShadowEffect { BlurRadius = 40, ShadowDepth = 0, Opacity = 0.6, Color = Colors.Black },
                Child = root,
                Opacity = 0,
            };
            frame.MouseLeftButtonDown += (s, e) => { if (e.ButtonState == MouseButtonState.Pressed) DragMove(); };
            Content = frame;

            // Two columns: the sky panel (brand, clouds, progress ring) and the controls.
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(330) });
            root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            BuildSky();
            Grid.SetColumn(content, 1);
            content.Margin = new Thickness(36, 40, 36, 32);
            root.Children.Add(content);
            BuildChrome();

            Loaded += (s, e) => Opening(frame);
            SetupSnapshots(frame);
        }

        // Test hook: FOLDCORD_SNAPSHOT=<dir> renders the window to PNGs while it runs.
        void SetupSnapshots(Border frame)
        {
            var dir = Environment.GetEnvironmentVariable("CLOUDCORD_SNAPSHOT");
            if (string.IsNullOrEmpty(dir)) return;
            var times = new[] { 700, 1300, 3600 };
            for (var i = 0; i < times.Length; i++)
            {
                var n = i + 1;
                var t = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(times[i]) };
                t.Tick += (s, e) => { t.Stop(); Snapshot(frame, IOPath.Combine(dir, "snap-" + n + ".png")); };
                t.Start();
            }
        }

        int panelShots;
        void SnapshotPanel()
        {
            var dir = Environment.GetEnvironmentVariable("CLOUDCORD_SNAPSHOT");
            if (string.IsNullOrEmpty(dir)) return;
            var n = ++panelShots;
            var frame = (Border)Content;
            foreach (var ms in new[] { 900, 2600 })
            {
                var at = ms;
                var t = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(at) };
                t.Tick += (s, e) => { t.Stop(); try { Snapshot(frame, IOPath.Combine(dir, "panel-" + n + "-" + at + ".png")); } catch { } };
                t.Start();
            }
        }

        public static void Snapshot(FrameworkElement el, string file)
        {
            var bmp = new RenderTargetBitmap((int)(el.ActualWidth + 40), (int)(el.ActualHeight + 40), 96, 96, PixelFormats.Pbgra32);
            bmp.Render(el);
            var enc = new PngBitmapEncoder();
            enc.Frames.Add(BitmapFrame.Create(bmp));
            using (var f = File.Create(file)) enc.Save(f);
        }

        // ---------- visuals ----------

        // The left "sky": a blue gradient with clouds drifting through it, the logo inside a
        // progress ring, and the title. It stays put while the right side changes.
        void BuildSky()
        {
            var grid = new Grid();
            sky = new Border
            {
                CornerRadius = new CornerRadius(22, 0, 0, 22),
                ClipToBounds = true,
                Background = new LinearGradientBrush(
                    new GradientStopCollection {
                        new GradientStop(Color.FromRgb(98, 178, 255), 0),
                        new GradientStop(Color.FromRgb(45, 107, 255), 0.55),
                        new GradientStop(Color.FromRgb(28, 52, 160), 1),
                    }, 90),
                Child = grid,
            };
            Grid.SetColumn(sky, 0);
            root.Children.Add(sky);

            var clouds = new Canvas { IsHitTestVisible = false };
            grid.Children.Add(clouds);
            AddCloud(clouds, 30, 150, 34, 4, 0.22);
            AddCloud(clouds, 150, 90, 26, 14, 0.16);
            AddCloud(clouds, 300, 190, 42, 22, 0.20);
            AddCloud(clouds, 420, 110, 30, 8, 0.14);

            // Logo inside a ring that fills up while installing.
            var badge = new Grid { Width = 150, Height = 150, HorizontalAlignment = HorizontalAlignment.Center };
            badge.Children.Add(new Ellipse { Fill = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)) });
            badge.Children.Add(new Ellipse { Stroke = new SolidColorBrush(Color.FromArgb(60, 255, 255, 255)), StrokeThickness = 6, Margin = new Thickness(3) });
            ring = new System.Windows.Shapes.Path { Stroke = Brushes.White, StrokeThickness = 6, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round };
            badge.Children.Add(ring);
            logo = new Image { Source = LoadImage("logo.png"), Width = 92, Height = 92, RenderTransformOrigin = new Point(0.5, 0.5),
                Effect = new DropShadowEffect { BlurRadius = 24, ShadowDepth = 0, Color = Color.FromRgb(20, 40, 120), Opacity = 0.6 } };
            badge.Children.Add(logo);

            var title = new TextBlock { Text = "CloudCord", FontSize = 36, FontWeight = FontWeights.Bold, Foreground = Brushes.White, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 22, 0, 0) };
            skySub = new TextBlock { Text = "Discord, your way.", FontSize = 15, Foreground = new SolidColorBrush(Color.FromArgb(220, 255, 255, 255)), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 4, 0, 0) };
            skyPercent = new TextBlock { FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 14, 0, 0), Opacity = 0 };

            brand = new StackPanel { VerticalAlignment = VerticalAlignment.Center, HorizontalAlignment = HorizontalAlignment.Center };
            brand.Children.Add(badge); brand.Children.Add(title); brand.Children.Add(skySub); brand.Children.Add(skyPercent);
            grid.Children.Add(brand);
        }

        // Fills the ring around the logo (0..1) and shows the percentage under the title.
        void SetRing(double frac)
        {
            frac = Math.Max(0, Math.Min(1, frac));
            const double r = 72, c = 75;
            if (frac >= 0.999)
            {
                ring.Data = new EllipseGeometry(new Point(c, c), r, r);
            }
            else
            {
                var angle = frac * 2 * Math.PI;
                var end = new Point(c + r * Math.Sin(angle), c - r * Math.Cos(angle));
                var fig = new PathFigure { StartPoint = new Point(c, c - r), IsClosed = false };
                fig.Segments.Add(new ArcSegment(end, new Size(r, r), 0, frac > 0.5, SweepDirection.Clockwise, true));
                ring.Data = new PathGeometry(new[] { fig });
            }
            skyPercent.Text = frac <= 0 ? "" : (int)Math.Round(frac * 100) + "%";
            skyPercent.Opacity = frac <= 0 ? 0 : 1;
        }

        void AddCloud(Canvas c, double y, double size, double seconds, double delay, double opacity)
        {
            var cloud = new Image { Source = LoadImage("logo.png"), Width = size, Height = size, Opacity = opacity };
            Canvas.SetTop(cloud, y);
            c.Children.Add(cloud);
            var t = new TranslateTransform(-size, 0);
            cloud.RenderTransform = t;
            var a = new DoubleAnimation(-size - 20, 340, TimeSpan.FromSeconds(seconds)) { RepeatBehavior = RepeatBehavior.Forever };
            // Start partway through so the sky isn't empty at first.
            a.BeginTime = TimeSpan.FromSeconds(-delay);
            t.BeginAnimation(TranslateTransform.XProperty, a);
        }

        void AddOrb(Canvas c, double size, Color color, double x, double y, double dx, double dy, double seconds)
        {
            var orb = new Ellipse
            {
                Width = size, Height = size, Opacity = 0.35,
                Fill = new RadialGradientBrush(color, Color.FromArgb(0, color.R, color.G, color.B)),
                Effect = new BlurEffect { Radius = 60 },
            };
            Canvas.SetLeft(orb, x); Canvas.SetTop(orb, y);
            c.Children.Add(orb);
            var t = new TranslateTransform();
            orb.RenderTransform = t;
            var ease = new SineEase { EasingMode = EasingMode.EaseInOut };
            t.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(0, dx, TimeSpan.FromSeconds(seconds)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = ease });
            t.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(0, dy, TimeSpan.FromSeconds(seconds * 0.8)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = ease });
        }

        void BuildChrome()
        {
            var bar = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, VerticalAlignment = VerticalAlignment.Top, Margin = new Thickness(0, 12, 14, 0) };
            bar.Children.Add(ChromeButton("", () => WindowState = WindowState.Minimized));
            bar.Children.Add(ChromeButton("", Close));
            Panel.SetZIndex(bar, 10);
            Grid.SetColumn(bar, 1);
            root.Children.Add(bar);
        }

        Button ChromeButton(string glyph, Action click)
        {
            var b = new Button
            {
                Content = new TextBlock { Text = glyph, FontFamily = new FontFamily("Segoe MDL2 Assets, Segoe Fluent Icons"), FontSize = 11, Foreground = MutedBrush },
                Width = 34, Height = 30, Margin = new Thickness(2, 0, 0, 0), Cursor = Cursors.Hand,
                Template = FlatTemplate(8, Color.FromArgb(40, 255, 255, 255)),
                Background = Brushes.Transparent,
            };
            b.Click += (s, e) => click();
            return b;
        }

        static ControlTemplate FlatTemplate(double radius, Color hover)
        {
            var t = new ControlTemplate(typeof(Button));
            var border = new FrameworkElementFactory(typeof(Border), "bd");
            border.SetBinding(Border.BackgroundProperty, new System.Windows.Data.Binding("Background") { RelativeSource = System.Windows.Data.RelativeSource.TemplatedParent });
            border.SetValue(Border.CornerRadiusProperty, new CornerRadius(radius));
            var cp = new FrameworkElementFactory(typeof(ContentPresenter));
            cp.SetValue(ContentPresenter.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            cp.SetValue(ContentPresenter.VerticalAlignmentProperty, VerticalAlignment.Center);
            border.AppendChild(cp);
            t.VisualTree = border;
            var trig = new Trigger { Property = UIElement.IsMouseOverProperty, Value = true };
            trig.Setters.Add(new Setter(UIElement.OpacityProperty, 0.88));
            t.Triggers.Add(trig);
            var press = new Trigger { Property = System.Windows.Controls.Primitives.ButtonBase.IsPressedProperty, Value = true };
            press.Setters.Add(new Setter(UIElement.RenderTransformProperty, new ScaleTransform(0.97, 0.97)));
            press.Setters.Add(new Setter(UIElement.RenderTransformOriginProperty, new Point(0.5, 0.5)));
            t.Triggers.Add(press);
            return t;
        }

        static BitmapImage LoadImage(string name)
        {
            var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
            if (s == null) return null;
            var img = new BitmapImage();
            img.BeginInit(); img.StreamSource = s; img.CacheOption = BitmapCacheOption.OnLoad; img.EndInit();
            return img;
        }

        Button PrimaryButton(string text, Action click)
        {
            var b = new Button
            {
                Content = new TextBlock { Text = text, FontSize = 15, FontWeight = FontWeights.SemiBold, Foreground = Brushes.White },
                Height = 46, MinWidth = 160, Padding = new Thickness(26, 0, 26, 0), Cursor = Cursors.Hand,
                Background = new LinearGradientBrush(Color.FromRgb(98, 178, 255), Accent2, 30),
                Template = FlatTemplate(12, Accent),
                Effect = new DropShadowEffect { BlurRadius = 24, ShadowDepth = 0, Opacity = 0.55, Color = Accent },
            };
            b.Click += (s, e) => click();
            return b;
        }

        Button GhostButton(string text, Action click)
        {
            var b = new Button
            {
                Content = new TextBlock { Text = text, FontSize = 14, FontWeight = FontWeights.SemiBold, Foreground = TextBrush },
                Height = 46, MinWidth = 120, Padding = new Thickness(20, 0, 20, 0), Cursor = Cursors.Hand,
                Background = new SolidColorBrush(Color.FromArgb(28, 255, 255, 255)),
                Template = FlatTemplate(12, Color.FromArgb(50, 255, 255, 255)),
            };
            b.Click += (s, e) => click();
            return b;
        }

        static void SlideIn(UIElement el, double delayMs)
        {
            el.Opacity = 0;
            var t = new TranslateTransform(40, 0);
            el.RenderTransform = t;
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            var begin = TimeSpan.FromMilliseconds(delayMs);
            el.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(420)) { BeginTime = begin, EasingFunction = ease });
            t.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(40, 0, TimeSpan.FromMilliseconds(420)) { BeginTime = begin, EasingFunction = ease });
        }

        static void FadeIn(UIElement el, double delayMs, double fromY = 18, double ms = 520)
        {
            el.Opacity = 0;
            var t = new TranslateTransform(0, fromY);
            el.RenderTransform = t;
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            var begin = TimeSpan.FromMilliseconds(delayMs);
            el.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(ms)) { BeginTime = begin, EasingFunction = ease });
            t.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(fromY, 0, TimeSpan.FromMilliseconds(ms)) { BeginTime = begin, EasingFunction = ease });
        }

        // ---------- screens ----------

        void Opening(Border frame)
        {
            frame.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300)));
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };

            var skyShift = new TranslateTransform(-330, 0);
            sky.RenderTransform = skyShift;
            skyShift.BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(-330, 0, TimeSpan.FromMilliseconds(700)) { EasingFunction = ease });

            var drop = new TranslateTransform(0, -70);
            logo.RenderTransform = drop;
            logo.Opacity = 0;
            var bounce = new BounceEase { EasingMode = EasingMode.EaseOut, Bounces = 2, Bounciness = 3 };
            var start = TimeSpan.FromMilliseconds(500);
            logo.BeginAnimation(UIElement.OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(400)) { BeginTime = start });
            var fall = new DoubleAnimation(-70, 0, TimeSpan.FromMilliseconds(900)) { BeginTime = start, EasingFunction = bounce };
            fall.Completed += (s2, e2) =>
                drop.BeginAnimation(TranslateTransform.YProperty, new DoubleAnimation(0, -6, TimeSpan.FromSeconds(1.8)) { AutoReverse = true, RepeatBehavior = RepeatBehavior.Forever, EasingFunction = new SineEase { EasingMode = EasingMode.EaseInOut } });
            drop.BeginAnimation(TranslateTransform.YProperty, fall);

            for (var i = 1; i < brand.Children.Count; i++) FadeIn(brand.Children[i], 900 + i * 120);
            SetRing(0);

            var timer = new System.Windows.Threading.DispatcherTimer { Interval = TimeSpan.FromMilliseconds(1300) };
            timer.Tick += (s2, e2) => { timer.Stop(); ShowChooser(); };
            timer.Start();
        }

        UIElement panel;

        void SetPanel(UIElement el)
        {
            if (panel != null)
            {
                var old = panel;
                var a = new DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(200));
                a.Completed += (s, e) => content.Children.Remove(old);
                old.BeginAnimation(UIElement.OpacityProperty, a);
            }
            panel = el;
            content.Children.Add(el);
            SlideIn(el, 80);
            SnapshotPanel();
        }

        void ShowChooser()
        {

            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            var header = new DockPanel { Margin = new Thickness(4, 0, 4, 10) };
            var version = new TextBlock { Text = "Checking latest version…", FontSize = 12, Foreground = MutedBrush, VerticalAlignment = VerticalAlignment.Center };
            DockPanel.SetDock(version, Dock.Right);
            header.Children.Add(version);
            header.Children.Add(new TextBlock { Text = "Choose where to install", FontSize = 13, FontWeight = FontWeights.SemiBold, Foreground = MutedBrush });
            stack.Children.Add(header);
            Task.Run(() =>
            {
                var v = Core.LatestVersion();
                Dispatcher.Invoke(() => version.Text = v != null ? "Installs " + v : "Offline: can't reach GitHub");
            });

            var found = builds.Where(b => b.Exists).ToList();
            if (found.Count == 0)
            {
                stack.Children.Add(Card(new TextBlock { Text = "Discord isn't installed yet. Install Discord first, then run this again.", Foreground = TextBrush, FontSize = 14, TextWrapping = TextWrapping.Wrap }));
            }
            var i = 0;
            foreach (var b in found)
            {
                var row = new DockPanel();
                var box = new CheckBox { IsChecked = i == 0, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 14, 0), Cursor = Cursors.Hand, Template = CheckTemplate() };
                picks[b] = box;
                DockPanel.SetDock(box, Dock.Left);
                row.Children.Add(box);
                var status = new TextBlock
                {
                    Text = b.IsInstalled ? "● CloudCord installed" : "Not installed",
                    Foreground = b.IsInstalled ? new SolidColorBrush(Color.FromRgb(87, 242, 135)) : MutedBrush,
                    FontSize = 13, VerticalAlignment = VerticalAlignment.Center
                };
                DockPanel.SetDock(status, Dock.Right);
                row.Children.Add(status);
                row.Children.Add(new TextBlock { Text = b.Name, FontSize = 16, FontWeight = FontWeights.SemiBold, Foreground = TextBrush, VerticalAlignment = VerticalAlignment.Center });
                var card = Card(row);
                card.Cursor = Cursors.Hand;
                card.MouseLeftButtonUp += (s, e) => { box.IsChecked = !(box.IsChecked ?? false); };
                card.Margin = new Thickness(0, 0, 0, 8);
                stack.Children.Add(card);
                FadeIn(card, 200 + i * 90);
                i++;
            }

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 14, 0, 0) };
            var uninstall = GhostButton("Uninstall", () => Run(false));
            uninstall.Margin = new Thickness(0, 0, 10, 0);
            buttons.Children.Add(uninstall);
            buttons.Children.Add(PrimaryButton(found.Any(b => b.IsInstalled) ? "Repair / Update" : "Install CloudCord", () => Run(true)));
            if (found.Count > 0) stack.Children.Add(buttons);

            SetPanel(stack);
        }

        // Rounded check box: outlined when off, purple with a white tick when on.
        static ControlTemplate CheckTemplate()
        {
            var t = new ControlTemplate(typeof(CheckBox));
            var box = new FrameworkElementFactory(typeof(Border), "box");
            box.SetValue(FrameworkElement.WidthProperty, 22.0);
            box.SetValue(FrameworkElement.HeightProperty, 22.0);
            box.SetValue(Border.CornerRadiusProperty, new CornerRadius(7));
            box.SetValue(Border.BorderThicknessProperty, new Thickness(2));
            box.SetValue(Border.BorderBrushProperty, new SolidColorBrush(Color.FromArgb(110, 255, 255, 255)));
            box.SetValue(Border.BackgroundProperty, Brushes.Transparent);
            var tick = new FrameworkElementFactory(typeof(System.Windows.Shapes.Path), "tick");
            tick.SetValue(System.Windows.Shapes.Path.DataProperty, Geometry.Parse("M 4,10 L 8,14 L 15,6"));
            tick.SetValue(Shape.StrokeProperty, Brushes.White);
            tick.SetValue(Shape.StrokeThicknessProperty, 2.6);
            tick.SetValue(Shape.StrokeStartLineCapProperty, PenLineCap.Round);
            tick.SetValue(Shape.StrokeEndLineCapProperty, PenLineCap.Round);
            tick.SetValue(Shape.StrokeLineJoinProperty, PenLineJoin.Round);
            tick.SetValue(UIElement.VisibilityProperty, Visibility.Collapsed);
            box.AppendChild(tick);
            t.VisualTree = box;
            var on = new Trigger { Property = System.Windows.Controls.Primitives.ToggleButton.IsCheckedProperty, Value = true };
            on.Setters.Add(new Setter(Border.BackgroundProperty, new SolidColorBrush(Accent), "box"));
            on.Setters.Add(new Setter(Border.BorderBrushProperty, new SolidColorBrush(Accent), "box"));
            on.Setters.Add(new Setter(UIElement.VisibilityProperty, Visibility.Visible, "tick"));
            t.Triggers.Add(on);
            return t;
        }

        Border Card(UIElement child)
        {
            return new Border
            {
                Child = child, Padding = new Thickness(18, 14, 18, 14), CornerRadius = new CornerRadius(14),
                Background = new SolidColorBrush(Color.FromArgb(22, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)), BorderThickness = new Thickness(1),
            };
        }

        void Run(bool install)
        {
            var targets = picks.Where(p => p.Value.IsChecked == true).Select(p => p.Key).ToList();
            if (targets.Count == 0) return;

            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            var heading = new TextBlock { Text = install ? "Installing CloudCord" : "Removing CloudCord", FontSize = 22, FontWeight = FontWeights.Bold, Foreground = TextBrush, Margin = new Thickness(0, 0, 0, 18) };
            var label = new TextBlock { Text = "Getting things ready…", FontSize = 13, Foreground = MutedBrush, Margin = new Thickness(0, 6, 0, 0) };

            // Step checklist: pending (dim), running (spinner), done (green tick).
            var stepNames = new List<string> { "Close Discord" };
            if (install) stepNames.Add("Download CloudCord");
            stepNames.Add(install ? "Install into " + string.Join(", ", targets.Select(t => t.Name)) : "Remove from " + string.Join(", ", targets.Select(t => t.Name)));
            var rows = new List<StepRow>();
            var list = new StackPanel();
            foreach (var name in stepNames)
            {
                var row = new StepRow(name);
                rows.Add(row);
                list.Children.Add(row.Root);
            }
            stack.Children.Add(heading);
            stack.Children.Add(list);
            stack.Children.Add(label);
            SetPanel(stack);
            skySub.Text = install ? "Installing…" : "Removing…";

            // Progress shows in the ring around the logo on the left.
            Action<double, string> step = (frac, text) => Dispatcher.Invoke(() =>
            {
                label.Text = text;
                SetRing(frac);
            });

            Action<int, StepState, string> mark = (i, state, detail) => Dispatcher.Invoke(() => rows[i].Set(state, detail));

            Task.Run(() =>
            {
                var current = 0;
                try
                {
                    System.Threading.Thread.Sleep(350);
                    // Every Discord build loads the same cloudcord.asar, so close them all before
                    // touching it; a running one keeps the file locked.
                    mark(0, StepState.Running, null);
                    step(0.1, "Closing Discord…");
                    foreach (var b in builds) Core.KillDiscord(b);
                    System.Threading.Thread.Sleep(500);
                    mark(0, StepState.Done, null);

                    if (install)
                    {
                        current = 1;
                        mark(1, StepState.Running, null);
                        step(0.15, "Downloading CloudCord…");
                        var lastUpdate = DateTime.MinValue;
                        Core.WriteDist((done, total) =>
                        {
                            if ((DateTime.Now - lastUpdate).TotalMilliseconds < 120 && done != total) return;
                            lastUpdate = DateTime.Now;
                            var frac = total > 0 ? (double)done / total : 0;
                            var detail = (done / 1048576.0).ToString("0.0") + (total > 0 ? " / " + (total / 1048576.0).ToString("0.0") : "") + " MB";
                            mark(1, StepState.Running, detail);
                            step(0.15 + 0.65 * frac, "Downloading CloudCord… " + (int)(frac * 100) + "%");
                        });
                        mark(1, StepState.Done, null);
                    }

                    current = rows.Count - 1;
                    mark(current, StepState.Running, null);
                    var n = 0;
                    foreach (var b in targets)
                    {
                        step(0.82 + 0.16 * n / targets.Count, (install ? "Installing into " : "Removing from ") + b.Name + "…");
                        if (install) Core.Inject(b); else Core.Remove(b);
                        n++;
                        System.Threading.Thread.Sleep(250);
                    }
                    mark(current, StepState.Done, null);
                    step(1, "Done");
                    System.Threading.Thread.Sleep(600);
                    Dispatcher.Invoke(() => ShowDone(install, targets));
                }
                catch (Exception ex)
                {
                    mark(current, StepState.Failed, null);
                    System.Threading.Thread.Sleep(500);
                    Dispatcher.Invoke(() => ShowError(ex.Message));
                }
            });
        }

        void ShowDone(bool installed, List<DiscordBuild> targets)
        {
            SetRing(installed ? 1 : 0);
            skySub.Text = installed ? "All set" : "Discord, your way.";
            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };

            var check = new Grid { Width = 74, Height = 74, HorizontalAlignment = HorizontalAlignment.Center };
            var circle = new Ellipse { Fill = new LinearGradientBrush(Color.FromRgb(98, 178, 255), Accent2, 45), Effect = new DropShadowEffect { BlurRadius = 30, ShadowDepth = 0, Color = Accent, Opacity = 0.8 } };
            var tick = new System.Windows.Shapes.Path
            {
                Data = Geometry.Parse("M 22,38 L 33,49 L 53,27"), Stroke = Brushes.White, StrokeThickness = 6,
                StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, StrokeLineJoin = PenLineJoin.Round,
                StrokeDashArray = new DoubleCollection { 10, 10 }, StrokeDashOffset = 10,
            };
            check.Children.Add(circle); check.Children.Add(tick);
            var pop = new ScaleTransform(0, 0);
            check.RenderTransformOrigin = new Point(0.5, 0.5);
            check.RenderTransform = pop;
            var back = new BackEase { EasingMode = EasingMode.EaseOut, Amplitude = 0.6 };
            pop.BeginAnimation(ScaleTransform.ScaleXProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(600)) { EasingFunction = back });
            pop.BeginAnimation(ScaleTransform.ScaleYProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(600)) { EasingFunction = back });
            tick.BeginAnimation(Shape.StrokeDashOffsetProperty, new DoubleAnimation(10, 0, TimeSpan.FromMilliseconds(500)) { BeginTime = TimeSpan.FromMilliseconds(350) });
            stack.Children.Add(check);

            stack.Children.Add(new TextBlock
            {
                Text = installed ? "CloudCord is installed" : "CloudCord was removed",
                FontSize = 24, FontWeight = FontWeights.Bold, Foreground = TextBrush, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 18, 0, 4)
            });
            stack.Children.Add(new TextBlock
            {
                Text = installed ? "Open Discord and a quick tour will show you around." : "Discord is back to normal.",
                FontSize = 14, Foreground = MutedBrush, HorizontalAlignment = HorizontalAlignment.Center
            });

            var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 22, 0, 0) };
            var close = GhostButton("Close", Close);
            close.Margin = new Thickness(0, 0, 10, 0);
            buttons.Children.Add(close);
            buttons.Children.Add(PrimaryButton("Open Discord", () => { foreach (var b in targets) Core.Launch(b); Close(); }));
            stack.Children.Add(buttons);

            SetPanel(stack);
        }

        void ShowError(string message)
        {
            SetRing(0);
            skySub.Text = "Discord, your way.";
            var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            stack.Children.Add(new TextBlock { Text = "Something went wrong", FontSize = 22, FontWeight = FontWeights.Bold, Foreground = new SolidColorBrush(Color.FromRgb(242, 63, 67)), HorizontalAlignment = HorizontalAlignment.Center });
            stack.Children.Add(new TextBlock { Text = message, FontSize = 14, Foreground = TextBrush, TextWrapping = TextWrapping.Wrap, TextAlignment = TextAlignment.Center, Margin = new Thickness(0, 10, 0, 18) });
            var again = PrimaryButton("Try again", ShowChooser);
            again.HorizontalAlignment = HorizontalAlignment.Center;
            stack.Children.Add(again);
            SetPanel(stack);
        }
    }
}
