import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const context = vm.createContext({ ui: {} });
for (const file of ['core/calculations.js','ui/actions/driving.js']) vm.runInContext(await fs.readFile(new URL(`../src/${file}`,import.meta.url),'utf8'),context);
const core=context.FuelMateDriving;
const trip={id:'t1',vehicleId:'v1',type:'trip',date:'2026-01-02',startOdometer:1000,odometer:1100,tripKind:'work',purpose:'Uber Eats',cost:0};
test('monthly cost is cash-based, excludes journeys and other months',()=>{
 const result=core.monthly([{type:'fuel',date:'2026-01-01',cost:80},{type:'insurance',date:'2026-01-02',cost:600},{type:'parking',date:'2026-01-03',cost:5},{type:'trip',date:'2026-01-02',cost:90},{type:'fuel',date:'2025-12-31',cost:100}], '2026-01');
 assert.equal(result.total,685); assert.equal(result.fuel,80); assert.equal(result.insurance,600);
});
test('estimates handle metric, MPG, invalid and zero values',()=>{
 assert.equal(core.estimate(500,8,2).cost,80);
 assert.equal(core.estimate(300,30,4,true).cost,40);
 assert.equal(core.estimate(0,8,2),null); assert.equal(core.estimate(100,NaN,2),null);
});
test('timeline selects explicit items and does not infer replacement from prose',()=>{
 const result=core.timeline([{id:'old',type:'service',date:'2025-01-01',odometer:900,maintenanceItems:['oil_change','battery']},{id:'new',type:'service',date:'2026-01-01',odometer:1000,maintenanceItems:['oil_change']},{id:'check',type:'repair',date:'2026-02-01',notes:'Battery checked'},{id:'tire',type:'tire_replace',date:'2026-01-01',odometer:1000}]);
 assert.equal(result[0].logs[0].id,'new'); assert.equal(result[2].logs.length,1); assert.equal(result[3].logs.length,1);
});
test('journey guards reject overlap but allow adjacent trips and other vehicles',()=>{
 assert.equal(core.tripError(trip), '');
 assert.equal(core.tripError({...trip,odometer:999}), 'range');
 assert.equal(core.tripError({...trip,purpose:''}), 'purpose');
 assert.equal(core.tripError(trip,[{...trip,id:'t2',startOdometer:1050,odometer:1200}]), 'overlap');
 assert.equal(core.tripError(trip,[{...trip,id:'t2',startOdometer:1100,odometer:1200}]), '');
 assert.equal(core.tripError(trip,[{...trip,id:'t2',vehicleId:'v2'}]), '');
 assert.equal(core.tripError(trip,[{id:'f',vehicleId:'v1',date:'2026-01-01',odometer:1050,type:'fuel'}]), 'order');
});
test('CSV quotes notes and neutralizes spreadsheet formulas',()=>{
 const csv=core.csv([{...trip,purpose:'=HYPERLINK("x")'}],'km','Mazda 2');
 assert.match(csv,/"'=HYPERLINK\(""x""\)"/); assert.match(csv,/"100","km"/);
});
test('backup validation accepts trip fields and rejects invalid journeys',()=>{
 const data={vehicles:[{id:'v1',make:'Mazda',model:'2',currentOdometer:1100}],logs:[trip]};
 assert.deepEqual(Array.from(context.FuelMateCore.validateImportPayload(data,()=>true).errors),[]);
 assert.ok(context.FuelMateCore.validateImportPayload({...data,logs:[{...trip,startOdometer:1200}]},()=>true).errors.includes('log_invalid_trip'));
});
