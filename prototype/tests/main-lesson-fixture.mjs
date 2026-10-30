// Baseline media/expansion order, excluding newly inserted comparison lessons.
export const mainLessons=list=>list.filter(l=>!(/^(25|35)-/.test(String(l.id))&&(l.kind??l.action)==='korean'));
export const baselineCatalog=list=>mainLessons(list).map((l,_,all)=>({...l,position:`${l.position.split('-')[0]}-${all.filter(x=>x.position.split('-')[0]===l.position.split('-')[0]).indexOf(l)+1}`}));
export const mainStops=stops=>stops.filter(m=>!(m[1]==='korean'&&/^(25|35)-/.test(m[2])));
