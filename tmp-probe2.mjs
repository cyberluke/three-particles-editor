import * as TSL from "three/tsl";
const keys = Object.keys(TSL);
console.log("count", keys.length);
console.log("has getCurrentStack:", "getCurrentStack" in TSL, "| has setCurrentStack:", "setCurrentStack" in TSL);
console.log(keys.filter(k => /stack/i.test(k)).join(", "));