import { Filed } from './Fileds.js';
import { DB_ACCESS } from './DBAccess.js';


export class Model{
    static _nextKeyPathValue ;
    #tableName;
    #isSelectedData;

    constructor(param={isSelectedData:false,}) {
        if (new.target == Model) {
            throw new Error('Cannot instantiate an abstract class.');
        }
        this.#tableName = new.target.name;
        this.#isSelectedData = param.isSelectedData;
    }

    get tableName() {
        return this.#tableName;
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
            record[filed] = this[filed].value;
        });
        return record
    }

    #insert() {
        var tableParams = this.#getTableParam();
        var keyPath = tableParams[0];
        var autoIncrement = tableParams[1];
        var fileds = tableParams[3];
        if (autoIncrement) {
            var keyPathValue = (this.constructor)._nextKeyPathValue;
            (this.constructor)._nextKeyPathValue++;
            console.log(`SET KEY: ${this.#tableName} ${keyPathValue}`);
            this[keyPath].value = keyPathValue;
        }
        DB_ACCESS.insertData(this.#tableName, this.#createRecord(fileds));
    }

    #update() {
        var tableParams = this.#getTableParam();
        DB_ACCESS.updateData(
            this.#tableName,
            tableParams[0],
            this[tableParams[0]].value,
            this.#createRecord(tableParams[3])
        );
    }

    save() {
        if (this.#isSelectedData) this.#update();
        else this.#insert();
    }

    delete() {
        var tableParams = this.#getTableParam();
        DB_ACCESS.deleteData(this.#tableName, this[tableParams[0]].value);
    }

    static async createTable() {
        var table = new this();
        var tableParams = table.#getTableParam();
        DB_ACCESS.createTable(table.tableName, tableParams[0], tableParams[2]);
    }

    static async setNextKeyPathValue() {
        var table = new this();
        var tableParams = table.#getTableParam();
        var keyPath = tableParams[0];
        var autoIncrement = tableParams[1];
        if (autoIncrement) {
            var maxValue = 0;
            (await this.selectAll()).forEach( data => {
                if (maxValue < data[keyPath].value)
                    maxValue = data[keyPath].value;
            });
            this._nextKeyPathValue = maxValue + 1;
            console.log(`nextKeyPathValue: ${table.#tableName} ${this._nextKeyPathValue}`);
        }
    }

    static async selectAll() {
        var filterFunc = (record) => { return true; };
        return this.select(filterFunc);
    }

    static async selectOne( filterFunc) {
        var modelData = null;
        var modelDatas = await this.select(filterFunc);
        if (modelDatas.length > 0) modelData = modelDatas[0];
        return modelData;
    }

    static async select( filterFunc) {
        var datas = await DB_ACCESS.getDatas((new this).tableName,filterFunc);
        var modelDatas = new Array();
        datas.forEach(data => {
            var modelData = new this({isSelectedData:true});
            Object.keys(data).forEach(filedName => {
                modelData[filedName].value = data[filedName];
            });
            modelDatas.push(modelData);
        });
        return modelDatas;
    }
}


class Models{
    #useModels = new Array();
    #nextKeyPathValues = {};

    get useModels() {
        return this.#useModels;
    }

    set useModels(models) {
        var isModels = true;
        models.forEach(model => {
            try {
                isModels &= (new model) instanceof Model;
            } catch {
                isModels = false;
            }
        });
        if(!(models instanceof Array) || !isModels)
            throw new Error('Require Models Array.');
        this.#useModels = models;
    }

    nextKeyPathValue(modelName) {
        console.log(`nextKeyPathValue: ${modelName}`,this.#nextKeyPathValues)
        return this.#nextKeyPathValues[modelName];
    }

    async createTables() {
        this.#useModels.forEach(model => {
            model.createTable();
        });
        await DB_ACCESS.commit();
        await this.setNextKeyPathValues();
    }

    async setNextKeyPathValues() {
        var waitCondtionFunc = (complateFlag) => {
            var isComplete = true;
            Object.keys(complateFlag).forEach(modelName => {
                isComplete &= complateFlag[modelName];
            });
            return !isComplete;
        }
        var complateFlag = {};
        this.#useModels.forEach(model => {
            complateFlag[(new model).tableName] = false;
            model.setNextKeyPathValue().then(() => {
                complateFlag[(new model).tableName] = true;
            });
        });
        await DB_ACCESS.waitReady(waitCondtionFunc,complateFlag);
    }
}

export const USE_MODELS = new Models();