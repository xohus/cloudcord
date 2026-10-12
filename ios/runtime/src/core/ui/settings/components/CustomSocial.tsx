import type { CustomConnectionPreview, CustomFriendPreview, ProfileAppearance } from "@lib/api/profileAppearance";
import { fetchConnectionPreview, searchConnectionItems, normalizeCustomSocial, mergeCustomSocialLookup, customSocialValidationErrors, customPreviewUsername, customConnectionServiceName } from "@lib/api/profileAppearance";
import { NavigationNative } from "@metro/common";
import { Text, Button, TableRow } from "@metro/common/components";
import { DiscordInput } from "./FakeProfileGlass";
import { useState, useRef, useEffect } from "react";
import { Image, Linking, ScrollView, View } from "react-native";

type Entry = CustomFriendPreview | CustomConnectionPreview;
type Navigation = { push: (route: string, options: any) => void };
const createId = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

function Picture({uri,banner=false}:{uri:string;banner?:boolean}) {
    const [failed,setFailed]=useState(false);
    useEffect(()=>setFailed(false),[uri]);
    return uri && !failed ? <Image source={{uri}} onError={()=>setFailed(true)} style={{width:banner?"100%":48,height:banner?120:48,borderRadius:banner?8:24}} /> : banner ? null : <Text color="text-muted">👤</Text>;
}
export function CustomSocialDetail({entry}:{entry:Entry}) {
    const connection="service" in entry;
    const [linkError,setLinkError]=useState("");
    const openLink=(url:string)=>{void Linking.openURL(url).catch(()=>setLinkError("Couldn't open this link. Try opening it in your browser."));};
    return <ScrollView contentContainerStyle={{padding:16,gap:14}}>
        <Picture uri={entry.banner} banner /><View style={{flexDirection:"row",alignItems:"center",gap:12}}><Picture uri={entry.avatar}/><View style={{flex:1}}><Text variant="heading-lg/bold" color="text-normal">{entry.displayName||entry.username||(connection?entry.accountId:entry.userId)}</Text><Text color="text-muted">{customPreviewUsername(entry.username)}</Text></View></View>
        <Text color="text-muted">Custom {connection?customConnectionServiceName(entry.service)+" connection":"friend"} preview · Not verified</Text>
        <Text color="text-normal">{connection?entry.accountId:entry.userId||""}</Text><Text color="text-normal">{entry.bio}</Text>
        {!connection && <View style={{flexDirection:"row",gap:8,flexWrap:"wrap"}}>{entry.badges.map((badge,index)=><View key={index} style={{flexDirection:"row",gap:4,alignItems:"center"}}>{badge.icon?<Image source={{uri:badge.icon}} style={{width:20,height:20}}/>:null}<Text color="text-normal">{badge.name}</Text></View>)}</View>}
        {connection && <>{entry.details.map((detail,index)=><View key={index}><Text color="text-muted">{detail.label}</Text><Text color="text-normal">{detail.value}</Text></View>)}{entry.url?<Button text="Open external account page" onPress={()=>openLink(entry.url)}/>:null}</>}
        {connection && entry.items?.map((item,index)=><TableRow key={`${item.id}-${index}`} arrow={!!item.url} label={item.title} subLabel={item.subtitle} icon={item.image?<TableRow.Icon source={{uri:item.image}}/>:undefined} onPress={()=>{if(item.url)openLink(item.url);}}/>)}
        {linkError?<Text color="text-normal">{linkError}</Text>:null}
    </ScrollView>;
}
function openDetail(navigation:Navigation,entry:Entry) {
    const normalized=normalizeCustomSocial("service" in entry?{customConnections:[entry]}:{customFriends:[entry]});
    const safe= "service" in entry?normalized.customConnections?.[0]:normalized.customFriends?.[0];
    if(safe) navigation.push("PUPU_CUSTOM_PAGE",{title:"Custom profile preview",render:()=> <CustomSocialDetail entry={safe}/>});
}
export function CustomSocialList({data}:{data:ProfileAppearance}) {
    const navigation=NavigationNative.useNavigation();
    const safe=normalizeCustomSocial(data);
    if(!safe.customFriends?.length&&!safe.customConnections?.length) return null;
    return <View style={{padding:12,gap:8}}>
        {!!safe.customFriends?.length&&<Text variant="heading-md/bold" color="text-normal">Custom friends</Text>}
        {safe.customFriends?.map(entry=><TableRow key={entry.id} arrow label={entry.displayName||entry.username||entry.userId} subLabel="Custom friend preview" icon={entry.avatar?<TableRow.Icon source={{uri:entry.avatar}}/>:undefined} onPress={()=>openDetail(navigation,entry)}/>)}
        {!!safe.customConnections?.length&&<Text variant="heading-md/bold" color="text-normal">Custom connections</Text>}
        {safe.customConnections?.map(entry=><TableRow key={entry.id} arrow label={entry.displayName||entry.username||entry.accountId} subLabel={`${customConnectionServiceName(entry.service)} · Custom preview`} icon={entry.avatar?<TableRow.Icon source={{uri:entry.avatar}}/>:undefined} onPress={()=>openDetail(navigation,entry)}/>)}
    </View>;
}
function Input({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}) {
    return <View style={{gap:4}}><Text color="text-muted">{label}</Text><DiscordInput value={value} onChangeText={onChange} autoCapitalize="none" /></View>;
}
export function CustomSocialEditor({data,onChange,resolveUser}:{data:ProfileAppearance;onChange:(value:ProfileAppearance)=>void;resolveUser:(id:string)=>Promise<Partial<CustomFriendPreview>|null>}) {
    const [selected,setSelected]=useState<string|null>(null), [error,setError]=useState(""),[loading,setLoading]=useState(false);
    const [accountQuery,setAccountQuery]=useState(""),[itemQuery,setItemQuery]=useState("");
    const [matches,setMatches]=useState<NonNullable<CustomConnectionPreview["items"]>>([]);
    const navigation=NavigationNative.useNavigation();
    const friends=data.customFriends||[],connections=data.customConnections||[];
    const entry=[...friends,...connections].find(item=>item.id===selected);
    const latest=useRef(data);latest.current=data;
    const activeSelection=useRef(selected);activeSelection.current=selected;
    const alive=useRef(true);
    const reportLookupError = (before: Entry, message: string) => {
        const current = [...(latest.current.customFriends || []), ...(latest.current.customConnections || [])].find(item => item.id === before.id);
        if (!alive.current || activeSelection.current !== before.id || !current) return;
        if ("service" in before ? !("service" in current) || current.service !== before.service : "service" in current || current.userId !== before.userId) return;
        setError(message);
    };
    useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
    useEffect(()=>{setAccountQuery("");setItemQuery("");setMatches([]);setError("");},[selected]);
    const showMatches=(before:CustomConnectionPreview,items:NonNullable<CustomConnectionPreview["items"]>)=>{
        const current=latest.current.customConnections?.find(item=>item.id===before.id);
        if(alive.current&&activeSelection.current===before.id&&current?.service===before.service)setMatches(items);
    };
    const update=(item:Entry)=>{
        if(!alive.current||!entry)return;
        const items="service" in item?latest.current.customConnections||[]:latest.current.customFriends||[];
        const merged=mergeCustomSocialLookup(entry,items.find(old=>old.id===item.id),item);
        if(!merged)return;
        onChange("service" in merged?{customConnections:(items as CustomConnectionPreview[]).map(old=>old.id===merged.id?merged:old)}:{customFriends:(items as CustomFriendPreview[]).map(old=>old.id===merged.id?merged:old)});
    };
    const patch=(fields:Partial<Entry>)=>{if(entry) update({...entry,...("service" in entry?{mode:"manual",fetchedAt:""}:{}),...fields} as Entry);};
    const add=(connection:boolean)=>{const common={id:createId(),username:"",displayName:"",avatar:"",banner:"",bio:""};if(connection)onChange({customConnections:[...connections,{...common,service:"steam",accountId:"",url:"",details:[]}]});else onChange({customFriends:[...friends,{...common,badges:[]}]});setSelected(common.id);setError("");};
    const move=(item:Entry,direction:number)=>{const items=[...("service" in item?connections:friends)];const index=items.findIndex(other=>other.id===item.id),target=index+direction;if(target<0||target>=items.length)return;[items[index],items[target]]=[items[target],items[index]];onChange("service" in item?{customConnections:items as CustomConnectionPreview[]}:{customFriends:items as CustomFriendPreview[]});};
    return <View style={{padding:14,gap:12}}><Text variant="heading-md/bold" color="text-normal">Custom friends & connections</Text><Text color="text-muted">Shared custom previews. These don't create real friendships or verified linked accounts.</Text>
        <Button text="Add friend" disabled={friends.length>=30} onPress={()=>add(false)}/><Button text="Add connection" disabled={connections.length>=30} onPress={()=>add(true)}/>
        {[...friends,...connections].map(item=><View key={item.id} style={{gap:6}}><TableRow arrow label={item.displayName||item.username||"New entry"} subLabel={"service" in item?customConnectionServiceName(item.service):"Custom friend"} onPress={()=>{setSelected(item.id);setError("");}}/><View style={{flexDirection:"row",flexWrap:"wrap",gap:6}}><Button text="Move up" onPress={()=>move(item,-1)}/><Button text="Move down" onPress={()=>move(item,1)}/><Button text="Preview" onPress={()=>openDetail(navigation,{...item,username:item.username||"Preview"})}/><Button text="Remove" onPress={()=>{onChange("service" in item?{customConnections:connections.filter(other=>other.id!==item.id)}:{customFriends:friends.filter(other=>other.id!==item.id)});if(selected===item.id)setSelected(null);}}/></View></View>)}
        {entry&&<View style={{gap:10}}>
            {!("service" in entry)&&<><Input label="Discord user ID (optional)" value={entry.userId||""} onChange={userId=>patch({userId})}/><Button text={loading?"Loading…":"Fill from user ID"} disabled={loading} onPress={async()=>{const current=entry;if(!/^\d{15,22}$/.test(current.userId||"")){setError("Enter a valid Discord user ID.");return;}setLoading(true);setError("");try{const found=await resolveUser(current.userId!);if(found)update({...current,...found,id:current.id,userId:current.userId});else reportLookupError(current,"User unavailable. Enter details manually or open their profile first.");}catch{reportLookupError(current,"Couldn't load that user. Your entry was kept.");}finally{if(alive.current)setLoading(false);}}}/></>}
            {"service" in entry&&<><TableRow arrow label="Service" subLabel={customConnectionServiceName(entry.service)} onPress={()=>navigation.push("PUPU_CUSTOM_PAGE",{title:"Connection service",render:()=> <ScrollView>{(["steam","youtube","roblox","twitch","github","spotify","x","reddit","other"] as const).map(service=><TableRow key={service} label={customConnectionServiceName(service)} onPress={()=>{patch({service});setMatches([]);navigation.goBack();}}/>)}</ScrollView>})}/><Input label="Fetch from account link, username or ID" value={accountQuery} onChange={setAccountQuery}/><Button text="Fetch public information" disabled={loading} onPress={async()=>{const current=entry;setLoading(true);setError("");try{const found=await fetchConnectionPreview(current.service,accountQuery||current.url||current.accountId||current.username);update({...found,id:current.id});}catch(error:any){reportLookupError(entry,error?.message||"Couldn't fetch public information.");}finally{if(alive.current)setLoading(false);}}}/><Text color="text-muted">Or edit fields manually. Public data doesn't verify account ownership.</Text><Input label="Account ID" value={entry.accountId} onChange={accountId=>patch({accountId})}/><Input label="Account link (HTTPS)" value={entry.url} onChange={url=>patch({url})}/></>}
            <Input label="Username" value={entry.username} onChange={username=>patch({username})}/><Input label="Display name" value={entry.displayName} onChange={displayName=>patch({displayName})}/><Input label="Avatar image (HTTPS)" value={entry.avatar} onChange={avatar=>patch({avatar})}/><Input label="Banner image (HTTPS)" value={entry.banner} onChange={banner=>patch({banner})}/><Input label="Bio" value={entry.bio} onChange={bio=>patch({bio})}/>
            {!("service" in entry)&&<>{entry.badges.map((badge,index)=><View key={index} style={{gap:6}}><Input label="Badge name" value={badge.name} onChange={name=>patch({badges:entry.badges.map((b,i)=>i===index?{...b,name}:b)})}/><Input label="Badge icon (HTTPS)" value={badge.icon} onChange={icon=>patch({badges:entry.badges.map((b,i)=>i===index?{...b,icon}:b)})}/><Button text="Remove badge" onPress={()=>patch({badges:entry.badges.filter((_,i)=>i!==index)})}/></View>)}<Button text="Add badge" disabled={entry.badges.length>=20} onPress={()=>patch({badges:[...entry.badges,{name:"Custom badge",icon:""}]})}/></>}
            {"service" in entry&&<>{entry.details.map((detail,index)=><View key={index} style={{gap:6}}><Input label="Information label" value={detail.label} onChange={label=>patch({details:entry.details.map((d,i)=>i===index?{...d,label}:d)})}/><Input label="Value" value={detail.value} onChange={value=>patch({details:entry.details.map((d,i)=>i===index?{...d,value}:d)})}/><Button text="Remove information" onPress={()=>patch({details:entry.details.filter((_,i)=>i!==index)})}/></View>)}<Button text="Add information" disabled={entry.details.length>=20} onPress={()=>patch({details:[...entry.details,{label:"Information",value:""}]})}/></>}
        </View>}
        {entry&&"service" in entry&&<View style={{gap:10}}><Text variant="heading-md/bold" color="text-normal">Choose games / videos / content</Text><Input label={entry.service==="steam"?"Search Steam games":entry.service==="youtube"?"Search YouTube videos or paste a video link":entry.service==="roblox"?"Roblox game link or universe ID":entry.service==="github"?"GitHub repository link or owner/repository":"Search content"} value={itemQuery} onChange={setItemQuery}/><Button text="Find content" disabled={loading} onPress={async()=>{setLoading(true);setError("");try{showMatches(entry,await searchConnectionItems(entry.service,itemQuery));}catch(error:any){reportLookupError(entry,error?.message||"Couldn't load content.");}finally{if(alive.current)setLoading(false);}}}/>
            {matches.map(item=><TableRow key={item.id} label={item.title} subLabel="Tap to add to custom preview" icon={item.image?<TableRow.Icon source={{uri:item.image}}/>:undefined} onPress={()=>{if((entry.items?.length||0)<30&&!entry.items?.some(old=>old.id===item.id))patch({items:[...(entry.items||[]),item]});}}/>)}
            {(entry.items||[]).map((item,index)=><View key={`${item.id}-${index}`} style={{gap:6}}><Input label="Title" value={item.title} onChange={title=>patch({items:entry.items!.map((old,i)=>i===index?{...old,title}:old)})}/><Input label="Image link" value={item.image} onChange={image=>patch({items:entry.items!.map((old,i)=>i===index?{...old,image}:old)})}/><Input label="Content link" value={item.url} onChange={url=>patch({items:entry.items!.map((old,i)=>i===index?{...old,url}:old)})}/><Input label="Description / playtime" value={item.subtitle} onChange={subtitle=>patch({items:entry.items!.map((old,i)=>i===index?{...old,subtitle}:old)})}/><Button text="Remove content" onPress={()=>patch({items:entry.items!.filter((_,i)=>i!==index)})}/></View>)}
            <Button text="Add content manually" disabled={(entry.items?.length||0)>=30} onPress={()=>patch({items:[...(entry.items||[]),{id:createId(),title:"Custom content",image:"",url:"",subtitle:""}]})}/>
        </View>}{error?<Text color="text-danger">{error}</Text>:null}
        {customSocialValidationErrors(data).map(issue=><Text key={issue} color="text-muted">{issue} Sharing resumes when this is fixed.</Text>)}
    </View>;
}
