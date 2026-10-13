import { CustomConnectionPreview, CustomFriendPreview, fetchConnectionPreview, searchConnectionItems, normalizeCustomSocial, mergeCustomSocialLookup, customSocialValidationErrors, customPreviewUsername, customConnectionServiceName, ProfileAppearance } from "@utils/profileAppearance";
import { ModalContent as NativeModalContent, ModalHeader as NativeModalHeader, ModalRoot as NativeModalRoot, openModal } from "@utils/modal";
import { ChannelActionCreators, React } from "@webpack/common";
import type { CSSProperties } from "react";
const ModalRoot = NativeModalRoot as any;
const ModalHeader = NativeModalHeader as any;
const ModalContent = NativeModalContent as any;

type Entry = CustomFriendPreview | CustomConnectionPreview;
const panel: CSSProperties = { padding: 12, borderRadius: 12, background: "var(--background-secondary)", color: "var(--text-normal)", marginBottom: 10 };
const button: CSSProperties = { padding: "8px 12px", borderRadius: 8, background: "var(--background-tertiary)", color: "var(--text-normal)", cursor: "pointer" };
const fields: CSSProperties = { display: "grid", gap: 10 };

function Picture({ url, banner = false }: { url: string; banner?: boolean; }) {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => setFailed(false), [url]);
    return url && !failed ? <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} style={{ width: banner ? "100%" : 48, height: banner ? 120 : 48, borderRadius: banner ? 8 : "50%", objectFit: "cover" }} /> : banner ? null : <span aria-hidden style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--background-tertiary)", display: "grid", placeItems: "center" }}>👤</span>;
}

export function SocialDetail({ entry, onRemove }: { entry: Entry; onRemove?: () => void; }) {
    const connection = "service" in entry;
    const [actionError, setActionError] = React.useState("");
    return <div style={panel}>
        <Picture url={entry.banner} banner />
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}><Picture url={entry.avatar} /><div><strong>{entry.displayName || entry.username || (connection ? entry.accountId : entry.userId)}</strong><div>{customPreviewUsername(entry.username)}</div></div></div>
        <p style={{ color: "var(--text-muted)" }}>Custom {connection ? `${customConnectionServiceName(entry.service)} connection` : "friend"} preview · Not verified</p>
        {!connection && entry.userId && <p>User ID: {entry.userId}</p>}
        {!connection && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
            <button style={button} disabled={!/^\d{15,22}$/.test(entry.userId || "")} onClick={() => { setActionError(""); try { Promise.resolve(ChannelActionCreators.openPrivateChannel(entry.userId!)).catch(() => setActionError("Couldn't open this conversation.")); } catch { setActionError("Couldn't open this conversation."); } }}>Message</button>
            {onRemove && <button style={{...button,color:"var(--text-danger)"}} onClick={onRemove}>Remove friend preview</button>}
            {!entry.userId && <p style={{color:"var(--text-muted)"}}>Add a real Discord user ID to open a conversation.</p>}
        </div>}
        {actionError && <p role="alert">{actionError}</p>}
        {connection && entry.accountId && <p>Account ID: {entry.accountId}</p>}
        {entry.bio && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.bio}</p>}
        {!connection && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{entry.badges.map((badge, i) => <span key={i} title={badge.name} style={{ display: "flex", gap: 4, alignItems: "center" }}>{badge.icon && <img src={badge.icon} alt="" referrerPolicy="no-referrer" width={20} height={20} onError={e => { e.currentTarget.hidden = true; }} />}{badge.name}</span>)}</div>}
        {connection && <><dl>{entry.details.map((detail, i) => <div key={i} style={{ marginBottom: 8 }}><dt style={{ color: "var(--text-muted)" }}>{detail.label}</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{detail.value}</dd></div>)}</dl>{entry.url && <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-link)" }}>Open external account page ↗</a>}</>}
        {connection && !!entry.items?.length && <div style={{display:"grid",gap:8,marginTop:12}}><h4>{entry.service === "youtube" ? "Selected videos" : "Selected games / content"}</h4>{entry.items.map((item,index)=><div key={`${item.id}-${index}`} style={{display:"flex",alignItems:"center",gap:8}}>{item.image&&<img src={item.image} alt="" referrerPolicy="no-referrer" width={64} height={40} style={{objectFit:"cover",borderRadius:6}}/>}<div>{item.url?<a href={item.url} target="_blank" rel="noopener noreferrer" style={{color:"var(--text-link)"}}>{item.title}</a>:<strong>{item.title}</strong>}<div style={{color:"var(--text-muted)"}}>{item.subtitle}</div></div></div>)}</div>}
    </div>;
}

export function openSocialDetail(entry: Entry, onRemove?: () => void) {
    openModal(props => <ModalRoot {...props}><ModalHeader><strong>{"service" in entry ? "Connection details" : "Friend profile"}</strong><button style={{ ...button, marginLeft: "auto" }} onClick={props.onClose}>Close</button></ModalHeader><ModalContent><SocialDetail entry={entry} onRemove={onRemove ? () => { onRemove(); props.onClose(); } : undefined} /></ModalContent></ModalRoot>);
}

/** Actions for an imported friend opened through their real Discord profile. */
export function FriendProfileActions({ userId, data, onRemove }: { userId: string; data?: ProfileAppearance | null; onRemove: (entry: CustomFriendPreview) => void; }) {
    const [removed, setRemoved] = React.useState(false);
    const [error, setError] = React.useState("");
    React.useEffect(() => setRemoved(false), [userId, data]);
    const friend = data?.customFriends?.find(entry => entry.userId === userId);
    if (!friend || removed) return null;
    return <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"12px 0"}} aria-label="Custom friend actions">
        <button style={button} onClick={() => { setError(""); try { Promise.resolve(ChannelActionCreators.openPrivateChannel(userId)).catch(() => setError("Couldn't open this conversation.")); } catch { setError("Couldn't open this conversation."); } }}>Message</button>
        <button style={button} onClick={() => openSocialDetail(friend, () => { onRemove(friend); setRemoved(true); })}>Friend details</button>
        <button style={{...button,color:"var(--text-danger)"}} onClick={() => { onRemove(friend); setRemoved(true); }}>Remove friend preview</button>
        {error && <p role="alert">{error}</p>}
    </div>;
}

function Input({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; }) {
    const style = { padding: 10, borderRadius: 8, background: "var(--background-tertiary)", color: "var(--text-normal)", width: "100%", boxSizing: "border-box" as const };
    return <label style={{ display: "grid", gap: 4 }}>{label}{multiline ? <textarea rows={3} value={value} style={style} onChange={e => onChange(e.target.value)} /> : <input value={value} style={style} onChange={e => onChange(e.target.value)} />}</label>;
}

const makeId = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function CustomSocialEditor({ data, onChange, resolveUser }: { data: ProfileAppearance; onChange: (value: ProfileAppearance) => void; resolveUser: (id: string) => Promise<Partial<CustomFriendPreview> | null>; }) {
    const [selected, setSelected] = React.useState<string | null>(null);
    const [error, setError] = React.useState("");
    const [lookingUp, setLookingUp] = React.useState(false);
    const [accountQuery, setAccountQuery] = React.useState("");
    const [itemQuery, setItemQuery] = React.useState("");
    const [matches, setMatches] = React.useState<NonNullable<CustomConnectionPreview["items"]>>([]);
    const [fetching, setFetching] = React.useState(false);
    const friends: CustomFriendPreview[] = [], connections = data.customConnections || [];
    const entry = [...friends, ...connections].find(item => item.id === selected);
    const connection = entry && "service" in entry;
    const latest = React.useRef(data);
    latest.current = data;
    const activeSelection = React.useRef(selected);
    activeSelection.current = selected;
    const alive = React.useRef(true);
    const reportLookupError = (before: Entry, message: string) => {
        const current = [...(latest.current.customFriends || []), ...(latest.current.customConnections || [])].find(item => item.id === before.id);
        if (!alive.current || activeSelection.current !== before.id || !current) return;
        if ("service" in before ? !("service" in current) || current.service !== before.service : "service" in current || current.userId !== before.userId) return;
        setError(message);
    };
    React.useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    React.useEffect(() => { setAccountQuery(""); setItemQuery(""); setMatches([]); setError(""); }, [selected]);
    const showMatches = (before: CustomConnectionPreview, items: NonNullable<CustomConnectionPreview["items"]>) => {
        const current = latest.current.customConnections?.find(item => item.id === before.id);
        if (alive.current && activeSelection.current === before.id && current?.service === before.service) setMatches(items);
    };
    const change = (updated: Entry) => {
        if (!alive.current || !entry) return;
        const items = "service" in updated ? latest.current.customConnections || [] : latest.current.customFriends || [];
        const merged = mergeCustomSocialLookup(entry, items.find(item => item.id === updated.id), updated);
        if (!merged) return;
        onChange("service" in merged ? { customConnections: (items as CustomConnectionPreview[]).map(item => item.id === merged.id ? merged : item) } : { customFriends: (items as CustomFriendPreview[]).map(item => item.id === merged.id ? merged : item) });
    };
    const patch = (value: Partial<Entry>) => { if (entry) change({ ...entry, ...("service" in entry ? {mode:"manual",fetchedAt:""} : {}), ...value } as Entry); };
    const remove = (item: Entry) => { onChange("service" in item ? { customConnections: connections.filter(other => other.id !== item.id) } : { customFriends: friends.filter(other => other.id !== item.id) }); if (selected === item.id) setSelected(null); };
    const move = (item: Entry, direction: number) => { const items = [...("service" in item ? connections : friends)]; const index = items.findIndex(other => other.id === item.id); const target = index + direction; if (target < 0 || target >= items.length) return; [items[index], items[target]] = [items[target], items[index]]; onChange("service" in item ? { customConnections: items as CustomConnectionPreview[] } : { customFriends: items as CustomFriendPreview[] }); };
    const add = (isConnection: boolean) => { const common = { id: makeId(), username: "", displayName: "", avatar: "", banner: "", bio: "" }; if (isConnection) onChange({ customConnections: [...connections, { ...common, service: "steam", accountId: "", url: "", details: [] }] }); else onChange({ customFriends: [...friends, { ...common, badges: [] }] }); setSelected(common.id); setError(""); };
    return <section style={panel}>
        <h3>Custom connections</h3><p style={{ color: "var(--text-muted)" }}>Use on all devices shares these clickable previews with CloudCord users. They don't verify linked accounts.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" style={button} disabled={connections.length >= 30} onClick={() => add(true)}>Add connection</button></div>
        {[...friends, ...connections].map(item => <div key={item.id} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}><button type="button" style={button} aria-pressed={selected === item.id} onClick={() => { setSelected(item.id); setError(""); }}>{item.displayName || item.username || "New entry"}</button><button type="button" style={button} aria-label="Move entry up" onClick={() => move(item, -1)}>↑</button><button type="button" style={button} aria-label="Move entry down" onClick={() => move(item, 1)}>↓</button><button type="button" style={button} onClick={() => openSocialDetail(normalizeCustomSocial("service" in item ? { customConnections: [{...item, username:item.username || "Preview"}] } : { customFriends: [{...item, username:item.username || "Preview"}] })["service" in item ? "customConnections" : "customFriends"]![0])}>Preview</button><button type="button" style={button} onClick={() => remove(item)}>Remove</button></div>)}
        {entry && <div style={{ ...fields, marginTop: 16 }}>
            {!connection && <><Input label="Discord user ID (optional)" value={(entry as CustomFriendPreview).userId || ""} onChange={userId => patch({userId})} /><button type="button" style={button} disabled={lookingUp} onClick={async () => { const current = entry as CustomFriendPreview; if (!/^\d{15,22}$/.test(current.userId || "")) { setError("Enter a valid Discord user ID first."); return; } setLookingUp(true); setError(""); try { const found = await resolveUser(current.userId!); if (!found) reportLookupError(current,"User not available. Enter their details manually or try again after opening their profile."); else change({...current,...found,id:current.id,userId:current.userId}); } catch { reportLookupError(current,"Could not load that user. Your entry was kept."); } finally { if(alive.current)setLookingUp(false); } }}>Fill from user ID</button></>}
            {connection && <><label>Service<select value={(entry as CustomConnectionPreview).service} style={button} onChange={e => {patch({ service: e.target.value as CustomConnectionPreview["service"] });setMatches([]);}}>{["steam","youtube","roblox","twitch","github","spotify","x","reddit","other"].map(service => <option key={service} value={service}>{customConnectionServiceName(service)}</option>)}</select></label><Input label="Fetch from public account link, username or ID" value={accountQuery} onChange={setAccountQuery}/><button style={button} disabled={fetching} onClick={async()=>{const current=entry as CustomConnectionPreview;setFetching(true);setError("");try{const found=await fetchConnectionPreview(current.service,accountQuery||current.url||current.accountId||current.username);change({...found,id:current.id});}catch(error){reportLookupError(entry,error instanceof Error?error.message:"Couldn't fetch public information.");}finally{if(alive.current)setFetching(false);}}}>Fetch public information</button><p style={{color:"var(--text-muted)"}}>Or customize all fields manually. Fetched data doesn't prove account ownership.</p><Input label="Account ID" value={(entry as CustomConnectionPreview).accountId} onChange={accountId => patch({accountId})} /><Input label="Account link (HTTPS)" value={(entry as CustomConnectionPreview).url} onChange={url => patch({url})} /></>}
            <Input label="Username" value={entry.username} onChange={username => patch({username})} /><Input label="Display name" value={entry.displayName} onChange={displayName => patch({displayName})} /><Input label="Avatar image link (HTTPS)" value={entry.avatar} onChange={avatar => patch({avatar})} /><Input label="Banner image link (HTTPS)" value={entry.banner} onChange={banner => patch({banner})} /><Input label="Bio" value={entry.bio} onChange={bio => patch({bio})} multiline />
            {!connection && <><h4>Badges</h4>{(entry as CustomFriendPreview).badges.map((badge, i) => <div key={i} style={fields}><Input label="Badge name" value={badge.name} onChange={name => patch({badges:(entry as CustomFriendPreview).badges.map((b,j)=>j===i?{...b,name}:b)})} /><Input label="Badge icon link" value={badge.icon} onChange={icon => patch({badges:(entry as CustomFriendPreview).badges.map((b,j)=>j===i?{...b,icon}:b)})} /><button style={button} onClick={()=>patch({badges:(entry as CustomFriendPreview).badges.filter((_,j)=>j!==i)})}>Remove badge</button></div>)}<button style={button} disabled={(entry as CustomFriendPreview).badges.length>=20} onClick={()=>patch({badges:[...(entry as CustomFriendPreview).badges,{name:"Custom badge",icon:""}]})}>Add badge</button></>}
            {connection && <><h4>Account information</h4>{(entry as CustomConnectionPreview).details.map((detail,i)=><div key={i} style={fields}><Input label="Information label" value={detail.label} onChange={label=>patch({details:(entry as CustomConnectionPreview).details.map((d,j)=>j===i?{...d,label}:d)})} /><Input label="Value" value={detail.value} onChange={value=>patch({details:(entry as CustomConnectionPreview).details.map((d,j)=>j===i?{...d,value}:d)})} /><button style={button} onClick={()=>patch({details:(entry as CustomConnectionPreview).details.filter((_,j)=>j!==i)})}>Remove information</button></div>)}<button style={button} disabled={(entry as CustomConnectionPreview).details.length>=20} onClick={()=>patch({details:[...(entry as CustomConnectionPreview).details,{label:"Information",value:""}]})}>Add information</button></>}
        </div>}
        {entry && "service" in entry && <div style={fields}>
            <h4>Choose games / videos / content</h4><Input label={entry.service==="steam"?"Search Steam games":entry.service==="youtube"?"Search YouTube videos or paste a video link":entry.service==="roblox"?"Roblox game link or universe ID":entry.service==="github"?"GitHub repository link or owner/repository":"Search content"} value={itemQuery} onChange={setItemQuery}/><button style={button} disabled={fetching} onClick={async()=>{setFetching(true);setError("");try{showMatches(entry,await searchConnectionItems(entry.service,itemQuery));}catch(error){reportLookupError(entry,error instanceof Error?error.message:"Couldn't load content.");}finally{if(alive.current)setFetching(false);}}}>Find content</button>
            {matches.map(item=><button key={item.id} style={button} disabled={(entry.items?.length||0)>=30} onClick={()=>{if(!entry.items?.some(existing=>existing.id===item.id))patch({items:[...(entry.items||[]),item]});}}>{item.title} · Add</button>)}
            {(entry.items||[]).map((item,index)=><div key={`${item.id}-${index}`} style={fields}><Input label="Title" value={item.title} onChange={title=>patch({items:entry.items!.map((old,i)=>i===index?{...old,title}:old)})}/><Input label="Image link" value={item.image} onChange={image=>patch({items:entry.items!.map((old,i)=>i===index?{...old,image}:old)})}/><Input label="Content link" value={item.url} onChange={url=>patch({items:entry.items!.map((old,i)=>i===index?{...old,url}:old)})}/><Input label="Description / playtime" value={item.subtitle} onChange={subtitle=>patch({items:entry.items!.map((old,i)=>i===index?{...old,subtitle}:old)})}/><button style={button} onClick={()=>patch({items:entry.items!.filter((_,i)=>i!==index)})}>Remove content</button></div>)}
            <button style={button} disabled={(entry.items?.length||0)>=30} onClick={()=>patch({items:[...(entry.items||[]),{id:makeId(),title:"Custom content",image:"",url:"",subtitle:""}]})}>Add content manually</button>
        </div>}
        {error && <p role="alert">{error}</p>}
        {customSocialValidationErrors(data).map(issue => <p key={issue} role="status" style={{color:"var(--text-muted)"}}>{issue}</p>)}
    </section>;
}
