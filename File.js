import EventDispatcher from 'foam-event/EventDispatcher';
import Event from 'foam-event/Event';

export default class File extends EventDispatcher{
    constructor(path){
        super();
        this.timeModifiedNew = -1;
        this.timeModifiedOld = -1;
        this.path = path;
    }
}