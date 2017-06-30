import {EventEmitter} from 'events';

export default class File extends EventEmitter{
    constructor(path){
        super();
        this.setMaxListeners(0);
        this.timeModifiedNew = -1;
        this.timeModifiedOld = -1;
        this.path = path;
    }
}