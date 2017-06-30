import File from './File';
import FileEvent from './FileEvent';

const DEFAULT_WATCH_DELAY = 500;

const noop = ()=>{};

export default class FileWatcher{
    /**
     * FileWatcher
     */
    constructor(){
        this._watches = [];
        this._watchesInvalid = [];
        this._watchesProcessed = -1;
        this._watchTimeStart = -1;
        this._watchDelay = DEFAULT_WATCH_DELAY;
        this._enabled = true;
    }

    /**
     * Sets the watchers file update rate.
     * @param milliseconds
     */
    setWatchDelay(milliseconds){
        this._watchDelay = milliseconds;
    }

    /**
     * Returns the watchers file update rate.
     * @returns {number|*}
     */
    getWatchDelay(){
        return this._watchDelay;
    }

    /**
     * Synchronously triggers all file watch requests and removes deleted files.
     * @private
     */
    _watch(){
        const watches = this._watches;
        const invalid = this._watchesInvalid;

        for (;invalid.length > 0;) {
            watches.splice(watches.indexOf(invalid.pop()), 1);
        }

        if(!this._enabled){
            return;
        }

        this._watchTimeStart   = Date.now();
        this._watchesProcessed = 0;
        this._watchesInvalid   = [];

        for(var i = 0, watch, request; i < watches.length; ++i){
            watch   = watches[i];
            request = watch.request;

            request.open('GET',watch.file.path);
            request.send();
        }
    }

    /**
     * Adds a file to watch.
     * @param path
     * @param config
     // * @param callbackModified
     // * @param callbackAdded
     // * @param callbackRemoved
     // * @param callbackNotValid
     */
    addFile(path,config){
        const onChange = config.onChange || noop;
        const onAdded    = config.onAdded || noop;
        const onRemoved  = config.onModified || noop;
        const onNotValid = config.onNotValid || noop;
        const type = config.type || 'text';

        if(this.hasFile(path)){
            return;
        }
        const self = this;

        function onWatchProcessed(){
            if(++self._watchesProcessed < self._watches.length){
                return;
            }
            const timeDiff = Date.now() - self._watchTimeStart;
            const delay = self._watchDelay;

            //Update took longer than default watch rate
            if(timeDiff >= delay){
                self._watch();
            }
            //Wait
            else {
                setTimeout(FileWatcher.prototype._watch.bind(self), delay - timeDiff);
            }
        }

        function watch(file){
            let watch_;
            const request = new XMLHttpRequest();
            request.addEventListener('readystatechange', function(){
                if(this.readyState != 4){
                    return;
                }
                const status = this.status;
                if(status === 200){
                    const time = new Date(request.getResponseHeader('Last-Modified'));
                    //error
                    if(time.toString() == 'Invalid Date'){
                        file.emit(FileEvent.FILE_NOT_VALID);
                        return;
                    }
                    //no change
                    if(time === file.timeModifiedNew){
                        return;
                    }
                    //file touched
                    if(time > file.timeModifiedNew){
                        switch(type){
                            case 'image' :
                                const image = new Image();
                                image.onload = ()=>{
                                    file.emit(FileEvent.FILE_MODIFIED,{data:image});
                                };
                                image.src = file.path;
                                break;
                            case 'text' :
                            default :
                                file.emit(FileEvent.FILE_MODIFIED,{data:this.responseText});
                                break;
                        }
                        file.timeModifiedOld = file.timeModifiedNew;
                        file.timeModifiedNew = time;
                    }
                    onWatchProcessed();
                }
                //file removed
                else if(status === 404){
                    file.emit(FileEvent.FILE_REMOVED);
                    self._watchesInvalid.push(watch_);
                    onWatchProcessed();
                }
            });

            watch_ = {file: file, request: request};
            self._watches.push(watch_);

            self._watch();
        }

        function addFile(file){
            const request = new XMLHttpRequest();
            request.open('GET',file.path);
            request.addEventListener('readystatechange', function(){
                if(this.readyState != 4){
                    return;
                }
                const status = this.status;
                if(status === 200){
                    file.emit(FileEvent.FILE_ADDED,{data:this.responseText});
                    watch(file);
                } else if(status === 404){
                    file.emit(FileEvent.FILE_REMOVED);
                }
            });
            request.send();
        }

        const request = new XMLHttpRequest();
        request.open('HEAD',path);

        //Get initial file info
        request.addEventListener('readystatechange',function(){
            if(this.readyState != 4){
                return;
            }
            const status = this.status;
            if(status == 200){

                const file = new File(path);
                if(onNotValid){
                    file.on(FileEvent.FILE_NOT_VALID,onNotValid);
                }
                // if(callbackNotValid){
                //     file.addEventListener(FileEvent.FILE_NOT_VALID,callbackNotValid);
                // }
                const time = new Date(request.getResponseHeader('Last-Modified'));
                //file not valid
                if(time.toString() == 'Invalid Date'){
                    file.emit(FileEvent.FILE_NOT_VALID);
                }
                //add initial time
                file.timeModifiedNew = time;

                //add listener
                if(onAdded){
                    file.on(FileEvent.FILE_ADDED,onAdded);
                }
                if(onChange){
                    file.on(FileEvent.FILE_MODIFIED,onChange);
                }
                if(onRemoved){
                    file.on(FileEvent.FILE_REMOVED,onRemoved);
                }

                addFile(file);

            } else if(status == 404){
                if(onNotValid){
                    onNotValid();
                    return;
                }
                console.log('File does not exist. File: ' + path);
            }
        });

        request.send();
    }

    /**
     * Removes a file from the watcher.
     * @param path
     */
    removeFile(path){
        if(!this.hasFile(path)){
            console.log('File not added to watcher. File: ' + path);
            return;
        }
        const watches = this._watches;
        for(var i = 0, len = watches.length; i < len; ++i){
            if(watches[i].file.path == path){
                watches.splice(i,1);
                return;
            }
        }
    }

    /**
     * Returns true if the watcher is currently watching the file path.
     * @param path
     * @returns {boolean}
     */
    hasFile(path){
        const watches = this._watches;
        for(var i = 0, len = watches.length; i < len; ++i){
            if(watches[i].file.path == path){
                return true;
            }
        }
        return false;
    }

    /**
     * Restarts the watcher if stopped.
     */
    restart(){
        if(this._watches.length == 0){
            return;
        }
        this._enabled = true;
        this._watch();
    }

    /**
     * Stops the watcher.
     */
    stop(){
        this._enabled = false;
    }
}