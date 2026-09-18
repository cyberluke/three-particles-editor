const A = await import("./public/lib/three.webgpu.js");
const B = await import("./public/lib/three.webgpu.js?v=5");
const C = await import("./public/lib/three.module.js");
console.log("three.webgpu no-query vs ?v=5 same instance?", A.Fn === B.Fn);
console.log("A.MeshBasicNodeMaterial vs B:", A.MeshBasicNodeMaterial === B.MeshBasicNodeMaterial);
console.log("three.module vs three.webgpu TSL class:", C.Vector3 === A.Vector3);
const T1 = await import("./public/lib/three.tsl.js");
const T2 = await import("./public/lib/three.tsl.js?v=5");
console.log("three.tsl no-query vs ?v=5 same instance?", T1.Fn === T2.Fn, "| T1.Fn vs A.Fn:", T1.Fn === A.Fn, "| T2.Fn vs B.Fn:", T2.Fn === B.Fn);