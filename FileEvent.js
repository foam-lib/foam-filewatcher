import Event from 'foam-event/Event';

export default class FileEvent extends Event{
    constructor(type,data){
        super(type,data);
    }
}

FileEvent.FILE_ADDED = 'fileadded';
FileEvent.FILE_MODIFIED = 'filemodified';
FileEvent.FILE_REMOVED = 'fileremoved';
FileEvent.FILE_NOT_VALID = 'filenotvalid';