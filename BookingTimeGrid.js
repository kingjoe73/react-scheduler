import React, { useRef, useEffect, useState } from 'react';

const getFullDate = (dt) => `${('0'+(dt.getMonth()+1)).slice(-2)}-${('0'+dt.getDate()).slice(-2)}-${dt.getFullYear()}`;
const getHrMin = (dt) => `${('0'+dt.getHours()).slice(-2)}:${('0'+dt.getMinutes()).slice(-2)}`;

const generateTimeGridEntries = (numOfHours, schedBlockSize, daysOfWeek, hrSegments, date) => {
    const today = new Date();
    const retVal = [];
    const dt = new Date();
    dt.setTime(date.getTime());

    daysOfWeek.forEach((dow, idx) => {
        const colEntries = [];
        let min = schedBlockSize;

        let hr = 0;
        let i = 0;
        let startTime = 0;
        let totalCells = numOfHours*hrSegments;

        while(i++ < totalCells) {
            let hh = ('0'+hr).slice(-2);
            startTime = (startTime || hh+":00");

            let endTime = ('0'+hr).slice(-2)+':'+('0'+min).slice(-2);
            if (i%hrSegments === 0) {
                min = 0;
                if (hr < 23) {
                    hr = hr%23+1;
                } else {
                    hr = 0;
                }
            }
            endTime = ('0'+hr).slice(-2)+':'+('0'+min).slice(-2);
            const stdt = getFullDate(dt);

            colEntries.push(
                <div stdt={stdt} stime={startTime} etime={endTime} key={`${stdt}_${startTime}`}>
                    <span className='info'/><span className='delete'/><span className='resize'/>
                </div>
            );

            startTime = endTime;
            min += schedBlockSize;
        }

        const isToday = (today.getFullYear() === dt.getFullYear() && 
        today.getMonth() === dt.getMonth() &&
        today.getDate() === dt.getDate()) ;
        retVal.push(<div className={`grid-entries ${isToday?'today':''}`} key={dow+idx}>{colEntries}</div>);
        dt.setDate(dt.getDate()+1);
    })

    return retVal;
}

const setBookedCells = (startAndEndNodes, schedule, popupRef, schedIdx) => {
    if (startAndEndNodes.length > 0) {
        let delNode = startAndEndNodes[0].querySelector('.delete');
        let resizeNode = startAndEndNodes[startAndEndNodes.length-1].querySelector('.resize');

        delNode.setAttribute('sched-idx', schedIdx);
        resizeNode.setAttribute('sched-idx', schedIdx);

        let isTaken = (schedule.info !== undefined);
        let showToolTip = null;
        if (isTaken) {
            let infoNode = startAndEndNodes[0].querySelector('.info');
            showToolTip = (x,y) => {
                const timeFormat = {hour:'2-digit',minute:'2-digit'};
                const sTime = schedule.start.toLocaleTimeString('en',timeFormat);
                const eTime = schedule.end.toLocaleTimeString('en',timeFormat);
                popupRef.current.innerHTML =
                        `Date: ${schedule.start.toLocaleDateString('en',{year:'numeric',month:'long',day:'2-digit'})} <br/>` +
                        `Time: ${sTime} - ${eTime}<br/>` +
                        `${JSON.stringify(schedule.info,null,' ').replace(/\"|{|}/g,'')}`;
                popupRef.current.style.display = 'block';
                popupRef.current.style.top = (y+15)+'px';
                popupRef.current.style.left = (x+15)+'px';
            }
            infoNode.addEventListener('mouseover', (e)=>showToolTip(e.clientX, e.clientY));
            infoNode.addEventListener('mouseout', ()=>popupRef.current.style.display='none');
        }

        let cssClass = `${isTaken?' taken':''} scheduled`;
        let elem = startAndEndNodes[0];
        while(elem !== startAndEndNodes[startAndEndNodes.length-1]) {
            elem.className += cssClass;
            elem = elem.nextElementSibling;
        }
        startAndEndNodes[0].className += ` sched-start`
        startAndEndNodes[startAndEndNodes.length-1].className += `${cssClass} sched-end`;
    }
}

const isSlotFree = (e) => (e.className.indexOf(' scheduled')===-1);
const isDelete = (e) => (e.className.indexOf('delete')!==-1);
const isResize = (e) => (e.className.indexOf('resize')!==-1);
const markAsScheduled = (e, cache, arrFxn='push') => {
    (!~e.className.indexOf(' scheduled') && (e.className += ' scheduled'));
    (!~cache.indexOf(e)&&cache[arrFxn](e));
}

const getStartEndDate = (sElem, eElem) => {
    const sTime = sElem.getAttribute('stime').split(':');
    const eTime = eElem.getAttribute('etime').split(':');

    const stDt = sElem.getAttribute('stdt');
    const sDt = new Date(stDt);
    const eDt = new Date(stDt);

    sDt.setHours(sTime[0],sTime[1],0);
    eDt.setHours(eTime[0],eTime[1],0);

    return {start: sDt, end: eDt};
}

document.Scheduler = {isBookingOk:false};

const fxns = {
    true: { cacheFxn: 'push', nodeProp: 'nextElementSibling'},
    false: { cacheFxn: 'unshift', nodeProp: 'previousElementSibling'}
}

const BookingTimeGrid = (props) => {
    const gridRef = useRef();
    const popupRef = useRef();
    const mounted = useRef(false);

    const { numOfHours,
            schedBlockSize,
            daysOfWeek,
            hrSegments,
            date,
            scrollHandler,
            scheduledData,
            onBookingSelected,
            onDeleteBooking,
            onBookingUpdated
        } = props;
    
    const [ timeGridEntries, setTimeGridEntries ] = useState([]);
    const [ schedules, setSchedules ] = useState(scheduledData);
    const [ scheduleState, setScheduleState ] = useState({
        startElem:null,
        endElem:null,
        schedCache:[],
        action:'scheduling'|'resize'|'delete'|null
    });

    // Set a global copy of the state for ouside grid mouse up
    document.Scheduler.schedState = scheduleState;

    const removeBooking = (cache=scheduleState.schedCache)=> {
        let tmp = null;
        while(tmp=cache.pop()) tmp.className = '';
    }

    const findScheduledBlock = (sElem, searchKey) => {
        let eElem = sElem;
        let isFwd = (searchKey === 'sched-end');
        let { cacheFxn, nodeProp } = fxns[isFwd];
        let cache = [sElem];
        while(eElem && eElem.className.indexOf(searchKey) === -1) {
            eElem = eElem[nodeProp];
            cache[cacheFxn](eElem);
        }
        return isFwd
            ? {startElem:sElem, endElem:eElem, schedCache:cache}
            : {startElem:eElem, endElem:sElem, schedCache:cache};
    }

    const restoreOriginalBooking = (sCache, rCache) => {
        removeBooking(sCache);
        if (rCache.length > 0) {
            rCache[0].className += ' sched-start';
            rCache[rCache.length-1].className += ' sched-end';
            let tmp = null;
            while(tmp=rCache.pop()) {
                markAsScheduled(tmp,[]);
            }
        }
    }

    const resetState = () => {
        setScheduleState({
            schedCache: [],  startElem: null, endElem: null, action: null
        });
    }

    useEffect(()=>{
        mounted.current = true;
        return ()=>{
            mounted.current = false;
        }
    },[]);

    useEffect(()=>{
        const { action, startElem, endElem, schedCache } = scheduleState;
        if (action==='scheduling' || action==='resize' && startElem && endElem) {
            const startRect = startElem.getBoundingClientRect();
            const currRect = endElem.getBoundingClientRect();
            const { cacheFxn, nodeProp } = fxns[startRect.top < currRect.top];
            let sElem = startElem;

            removeBooking();
            markAsScheduled(sElem, schedCache);
            while(sElem !== endElem) {
                sElem = sElem[nodeProp];
                if (!sElem) break;
                if (!isSlotFree(sElem))  break;
                markAsScheduled(sElem, schedCache, cacheFxn);
            }

        }
    }, [scheduleState]);


    const onMouseDown = async (e) => {
        if (e.target.className.indexOf('grid-container') !== -1) return;

        const isFree = isSlotFree(e.target);
        const del = isDelete(e.target);
        const resize = isResize(e.target);

        if (isFree && !del && !resize) {
            document.Scheduler.isBookingOk = false;
            setScheduleState({
                action: 'scheduling',
                schedCache: [],
                startElem: e.target,
                endElem: e.target
            });

        } else if (del) {
            setScheduleState({
                action: 'delete',
                ...findScheduledBlock(e.target.parentElement, 'sched-end'),
                schedIdx: e.target.getAttribute('sched-idx')
            })

        } else if (resize) {
            let props = findScheduledBlock(e.target.parentElement, 'sched-start');

            props.schedCache[0].className = 'scheduled';
            props.schedCache[props.schedCache.length-1].className = 'scheduled';

            setScheduleState({
                action:'resize',
                ...props,
                resizeCache: props.schedCache.map(i=>i),
                schedIdx: e.target.getAttribute('sched-idx')
            })
        }
    }

    const onMouseMove = (e) => {
        const { action, startElem } = scheduleState;
        if ((action === 'scheduling' || action === 'resize') && startElem) {
            const rect = e.target.getBoundingClientRect();
            const startRect = startElem.getBoundingClientRect();
            if (startRect.left === rect.left) {
                setScheduleState({
                    ...scheduleState,
                    endElem: e.target,
                });
            }
        }
    }

    const onMouseUp = async (e) => {
        const { action, schedCache, resizeCache, startElem, endElem } = scheduleState;

        if (startElem) {
            let rect = e.target.getBoundingClientRect();
            if (action==='resize' || action==='delete') {
                rect = e.target.parentElement.getBoundingClientRect();
            }

            const startRect = startElem.getBoundingClientRect();

            if (action==='scheduling') {
                if (startElem && startRect.left === rect.left) {
                    document.Scheduler.isBookingOk = true;
                    const { start, end } = getStartEndDate(schedCache[0], schedCache[schedCache.length-1]);

                    if (onBookingSelected) {
                        if (await onBookingSelected(start, end)) {
                            scheduledData.push({start:start, end:end});
                            setSchedules(scheduledData.map(i=>i));
                            schedCache[0].className += ' sched-start';
                            schedCache[schedCache.length-1].className += ' sched-end';
                        } else {
                            removeBooking();
                        }
                    } else {
                        alert('You selected ' + start.toString() + ' - ' + end.toString());
                    }

                    resetState();
                }


            } else if (action === 'delete') {
                if (e.target === schedCache[0].querySelector('.delete')) {
                    const { start, end } = getStartEndDate(startElem, endElem);
                    if (onDeleteBooking) {
                        if (await onDeleteBooking(start, end)) {
                            removeBooking();
                            e.target.removeAttribute('sched-idx');
                            scheduledData.splice(scheduleState.schedIdx, 1);
                            setSchedules(scheduledData.map(i=>i));
                        }
                    } else {
                        removeBooking();
                    }

                    resetState();
                }

            } else if (action === 'resize') {
                if (startRect.left === rect.left) {
                    document.Scheduler.isBookingOk = true;
                    const { start, end } = getStartEndDate(schedCache[0], schedCache[schedCache.length-1]);

                    if (schedCache[0] === resizeCache[0] &&
                        schedCache[schedCache.length-1] === resizeCache[resizeCache.length-1])
                        return; // Nothing changed

                    if (onBookingUpdated) {
                        if (await onBookingUpdated(start, end)) {
                            resizeCache[resizeCache.length-1].querySelector('.resize').removeAttribute('sched-idx');

                            scheduledData[scheduleState.schedIdx].start = start;
                            scheduledData[scheduleState.schedIdx].end = end;

                            let topNode = schedCache[0];
                            let bottomNode = schedCache[schedCache.length-1];

                            topNode.className += ' sched-start';
                            bottomNode.className += ' sched-end';

                            bottomNode.querySelector('.resize').setAttribute('sched-idx', scheduleState.schedIdx);
                            topNode.querySelector('.delete').setAttribute('sched-idx', scheduleState.schedIdx);
                            
                        } else {
                            restoreOriginalBooking(schedCache, resizeCache);
                        }
                    }

                    resetState();
                }
            }
        }
    }

    useEffect(()=>{
        if (timeGridEntries.length > 0) {
            console.log(">>> Adding Outside Grid Listener");
            document.addEventListener('mouseup',(e)=>{
                if (mounted.current) {
                    const { isBookingOk, action, schedCache, resizeCache } = document.Scheduler.schedState;
                    if (!isBookingOk &&
                        action !== 'delete' &&
                        action !== 'resize'
                    ){
                        console.log(">>> Resetting selection");
                        removeBooking(schedCache);
                        resetState();
                    } else if (action==='resize') {
                        restoreOriginalBooking(schedCache, resizeCache);
                        resetState();
                    }
                }
            });
        }
    }, [timeGridEntries]);

    useEffect(()=> {
        setTimeGridEntries(
            generateTimeGridEntries(
                numOfHours,
                schedBlockSize,
                daysOfWeek,
                hrSegments,
                date
            )
        );
    },[date]);

    useEffect(()=>{
        if (timeGridEntries.length > 0) {
            console.log(">>> Setting Scheduled Dates ");
            schedules.forEach((item, idx) => {
                let sdt = new Date(item.start);
                let edt = new Date(item.end);
                let sTime = getHrMin(sdt);
                let eTime = getHrMin(edt);
                let dtstr = getFullDate(sdt);

                let startDt = `[stdt="${dtstr}"]`;
                const nodes = gridRef.current.querySelectorAll(`${startDt}[stime="${sTime}"],${startDt}[etime="${eTime}"]`);
                setBookedCells(nodes, item, popupRef, idx);
            })

            const rect = gridRef.current.querySelector('[stime="09:00"]').getBoundingClientRect();
            const containerRect = gridRef.current.getBoundingClientRect();
            gridRef.current.scrollBy(0,rect.top-containerRect.top+1)
        }
    }, [timeGridEntries, schedules]);

    return (
        <div ref={gridRef} className="grid-container"
                onScroll={(e)=>{scrollHandler&&scrollHandler(e);}}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}>
            {timeGridEntries}
            <div ref={popupRef} className='meeting-popup'></div>
        </div>
    );
}

export default BookingTimeGrid;