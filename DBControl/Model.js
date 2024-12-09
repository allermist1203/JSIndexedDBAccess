import { Filed } from './Fileds.js';
import { DB_ACCESS } from './DBAccess.js';

export class Model{
    #tableName;

    constructor() {
        if (new.target == Model) {
            throw new Error('Cannot instantiate an abstract class.');
        }
        this.#tableName = new.target.name;
    }

    #getTableParam() {
        var keyPath;
        var autoIncrement;
        var indexes = {};
        var fileds = new Array();
        Object.getOwnPropertyNames(this).forEach(property => {
            if (!(this[property] instanceof Filed)) return;
            var column = this[property];
            if (column.isKeyPath) {
                keyPath = property;
                autoIncrement = column.autoIncrement;
            }
            if (column.requiredIndex) indexes[property] = column.unique;
            fileds.push(property);
        });
        return [keyPath, autoIncrement, indexes, fileds];
    }

    #createRecord(fileds) {
        var record = {};
        fileds.forEach(filed => {
            if(!this[filed].autoIncrement)
                record[filed] = this[filed].value;
        });
        return record
    }

    insert() {
        var tableParams = this.#getTableParam();
        DB_ACCESS.insertData(this.#tableName, this.#createRecord(tableParams[3]));
    }

    update() {
        var tableParams = this.#getTableParam();
        DB_ACCESS.updateData(
            this.#tableName,
            tableParams[0],
            this[tableParams[0]].value,
            this.#createRecord(tableParams[3])
        );
    }

    delete() {
        var tableParams = this.#getTableParam();
        DB_ACCESS.deleteData(this.#tableName, this[tableParams[0]].value);
    }

    static createTable() {
        var table = new this();
        var tableParams = table.#getTableParam();
        DB_ACCESS.createTable(this.name, tableParams[0], tableParams[1], tableParams[2]);
    }

    static async selectAll() {
        var filterFunc = (record) => { return true; };
        return this.select(filterFunc);
    }

    static async select( filterFunc) {
        var datas = await DB_ACCESS.getDatas(this.name,filterFunc);
        var modelDatas = new Array();
        datas.forEach(data => {
            var modelData = new this();
            Object.keys(data).forEach(filedName => {
                modelData[filedName].value = data[filedName];
            });
            modelDatas.push(modelData);
        });
        return modelDatas;
    }
}
