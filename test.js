import { Model } from './DBControl/Model.js';
import { IntegerFiled, StringFiled } from './DBControl/Fileds.js';
import { DB_ACCESS } from './DBControl/DBAccess.js';

class TestDB extends Model{
    id = new IntegerFiled({isKeyPath:true,autoIncrement:true});
    subid = new IntegerFiled({});
    note = new StringFiled({requiredIndex:true, unique:false});
}

/*
TestDB.createTable();

DB_ACCESS.commit().then(() => {
    console.log('aaa')
    var data1 = new TestDB();
    data1.subid.value = 1;
    data1.note.value = 'test';
    data1.insert();
    //data1.id.value = 1;
    //data1.delete();
    DB_ACCESS.commit();
});
*/
/*
TestDB.selectAll().then(datas => {
    console.log(datas);
});
*/
var filterFunc = (record) => {
    return record['id'] < 67;
};
TestDB.select(filterFunc).then(datas => {
    datas.forEach(data => {
        data.subid.value++;
        console.log(data);
        data.update();
    });
    DB_ACCESS.commit();
});
