import React, { useRef, useEffect, useState } from 'react';



const getFullDate = (dt) => `${('0'+(dt.getMonth()+1)).slice(-2)}-${('0'+dt.getDate()).slice(-2)}-${dt.getFullYear()}`;
const getHrMin = (dt) => `${('0'+dt.getHours()).slice(-2)}:${('0'+dt.getMinutes()).slice(-2)}`;

const generateTimeGridEntries = (numOfHours, bookingBlockSize, daysOfWeek, hrSegments, date) => {
    const today = new Date();
    const retVal = [];
    const dt = new Date();
    dt.setTime(date.getTime());

    daysOfWeek.forEach((dow, idx) => {
        const colEntries = [];
        let min = bookingBlockSize;

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
            min += bookingBlockSize;
        }

        const isToday = (today.getFullYear() === dt.getFullYear() && 
        today.getMonth() === dt.getMonth() &&
        today.getDate() === dt.getDate()) ;
        retVal.push(<div className={`grid-entries ${isToday?'today':''}`} key={dow+idx}>{colEntries}</div>);
        dt.setDate(dt.getDate()+1);
    })

    return retVal;
}

const setBookedCells = (startAndEndNodes, booking, popupRef, bookingIdx) => {
    if (startAndEndNodes.length > 0) {
        let delNode = startAndEndNodes[0].querySelector('.delete');
        let resizeNode = startAndEndNodes[startAndEndNodes.length-1].querySelector('.resize');

        delNode.setAttribute('booking-idx', bookingIdx);
        resizeNode.setAttribute('booking-idx', bookingIdx);

        let isTaken = (booking.info !== undefined);
        let showToolTip = null;
        if (isTaken) {
            let infoNode = startAndEndNodes[0].querySelector('.info');
            showToolTip = (x,y) => {
                const sTime = booking.start.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
                const eTime = booking.end.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
                popupRef.current.innerHTML =
                        `Date: ${getFullDate(booking.start)} <br/>` +
                        `Time: ${sTime} - ${eTime}<br/>` +
                        `${JSON.stringify(booking.info,null,' ').replace(/\"|{|}/g,'')}`;
                popupRef.current.style.display = 'block';
                popupRef.current.style.top = (y+15)+'px';
                popupRef.current.style.left = (x+15)+'px';
            }
            infoNode.addEventListener('mouseover', (e)=>showToolTip(e.clientX, e.clientY));
            infoNode.addEventListener('mouseout', ()=>popupRef.current.style.display='none');
        }

        let bookedClass = `${isTaken?' taken':''} booked`;
        let elem = startAndEndNodes[0];
        while(elem !== startAndEndNodes[startAndEndNodes.length-1]) {
            elem.className += bookedClass;
            elem = elem.nextElementSibling;
        }
        startAndEndNodes[0].className += ` sched-start`
        startAndEndNodes[startAndEndNodes.length-1].className += `${bookedClass} sched-end`;
    }
}

const isBooked = (e) => (e.className.indexOf(' booked')!==-1);
const isDelete = (e) => (e.className.indexOf('delete')!==-1);
const isResize = (e) => (e.className.indexOf('resize')!==-1);
const markAsBooked = (e, cache, arrFxn='push') => {
    (!~e.className.indexOf(' booked') && (e.className += ' booked'));
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

    const { numOfHours,
            bookingBlockSize,
            daysOfWeek,
            hrSegments,
            date,
            scrollHandler,
            bookedTimes,
            onBookingSelected,
            onDeleteBooking,
            onBookingUpdated
        } = props;

    const [ timeGridEntries, setTimeGridEntries ] = useState([]);
    const [ booked, setBooked ] = useState(bookedTimes);
    const [ bookingState, setBookingState ] = useState({
        startElem:null,
        endElem:null,
        bookingCache:[],
        action:'booking'|'resize'|'delete'|null
    });

    // Set a global copy of the state for ouside grid mouse up
    document.Scheduler.bookingState = bookingState;

    const removeBooking = (cache=bookingState.bookingCache)=> {
        let tmp = null;
        while(tmp=cache.pop()) tmp.className = '';
    }

    const findBookedBlock = (sElem, searchKey) => {
        let eElem = sElem;
        let isFwd = (searchKey === 'sched-end');
        let { cacheFxn, nodeProp } = fxns[isFwd];
        let cache = [sElem];
        while(eElem && eElem.className.indexOf(searchKey) === -1) {
            eElem = eElem[nodeProp];
            cache[cacheFxn](eElem);
        }
        return isFwd
            ? {startElem:sElem, endElem:eElem, bookingCache:cache}
            : {startElem:eElem, endElem:sElem, bookingCache:cache};
    }

    const restoreOriginalBooking = (bCache, rCache) => {
        removeBooking(bCache);
        if (rCache.length > 0) {
            rCache[0].className += ' sched-start';
            rCache[rCache.length-1].className += ' sched-end';
            let tmp = null;
            while(tmp=rCache.pop()) {
                markAsBooked(tmp,[]);
            }
        }
    }

    const resetState = () => {
        setBookingState({
            bookingCache: [],  startElem: null, endElem: null, action: null
        });
    }

    useEffect(()=>{
        const { action, startElem, endElem, bookingCache } = bookingState;
        if (action==='booking' || action==='resize' && startElem && endElem) {
            const startRect = startElem.getBoundingClientRect();
            const currRect = endElem.getBoundingClientRect();
            const { cacheFxn, nodeProp } = fxns[startRect.top < currRect.top];
            let sElem = startElem;

            removeBooking();
            markAsBooked(sElem, bookingCache);
            while(sElem !== endElem) {
                sElem = sElem[nodeProp];
                if (!sElem) break;
                if (isBooked(sElem))  break;
                markAsBooked(sElem, bookingCache, cacheFxn);
            }

        }
    }, [bookingState]);


    const onMouseDown = async (e) => {
        if (e.target.className.indexOf('grid-container') !== -1) return;

        const booked = isBooked(e.target);
        const del = isDelete(e.target);
        const resize = isResize(e.target);

        if (!booked && !del && !resize) {
            document.Scheduler.isBookingOk = false;
            setBookingState({
                action: 'booking',
                bookingCache: [],
                startElem: e.target,
                endElem: e.target
            });

        } else if (del) {
            setBookingState({
                action: 'delete',
                ...findBookedBlock(e.target.parentElement, 'sched-end'),
                bookingIdx: e.target.getAttribute('booking-idx')
            })

        } else if (resize) {
            let props = findBookedBlock(e.target.parentElement, 'sched-start');

            props.bookingCache[0].className = 'booked';
            props.bookingCache[props.bookingCache.length-1].className = 'booked';

            setBookingState({
                action:'resize',
                ...props,
                resizeCache: props.bookingCache.map(i=>i),
                bookingIdx: e.target.getAttribute('booking-idx')
            })
        }
    }

    const onMouseMove = (e) => {
        const { action, bookingCache, startElem, resizeCache } = bookingState;
        if ((action === 'booking' || action === 'resize') && startElem) {
            const rect = e.target.getBoundingClientRect();
            const startRect = startElem.getBoundingClientRect();
            if (startRect.left === rect.left) {
                setBookingState({
                    ...bookingState,
                    endElem: e.target,
                    /*
                    action: action,
                    bookingCache: bookingCache || [],
                    startElem: startElem || e.target,
                    endElem: e.target,
                    resizeCache: resizeCache
                    */
                });
            }
        }
    }

    const onMouseUp = async (e) => {
        const { action, bookingCache, resizeCache, startElem, endElem } = bookingState;

        if (startElem) {
            let rect = e.target.getBoundingClientRect();
            if (action==='resize' || action==='delete') {
                rect = e.target.parentElement.getBoundingClientRect();
            }

            const startRect = startElem.getBoundingClientRect();

            if (action==='booking') {
                if (startElem && startRect.left === rect.left) {
                    document.Scheduler.isBookingOk = true;
                    const { start, end } = getStartEndDate(bookingCache[0], bookingCache[bookingCache.length-1]);

                    if (onBookingSelected) {
                        if (await onBookingSelected(start, end)) {
                            bookedTimes.push({start:start, end:end});
                            setBooked(bookedTimes.map(i=>i));
                            bookingCache[0].className += ' sched-start';
                            bookingCache[bookingCache.length-1].className += ' sched-end';
                        } else {
                            removeBooking();
                        }
                    } else {
                        alert('You selected ' + start.toString() + ' - ' + end.toString());
                    }

                    resetState();
                }


            } else if (action === 'delete') {
                if (e.target === bookingCache[0].querySelector('.delete')) {
                    const { start, end } = getStartEndDate(startElem, endElem);
                    if (onDeleteBooking) {
                        if (await onDeleteBooking(start, end)) {
                            removeBooking();
                            bookedTimes.splice(bookingState.bookingIdx, 1);
                            setBooked(bookedTimes.map(i=>i));
                        }
                    } else {
                        removeBooking();
                    }

                    resetState();
                }

            } else if (action === 'resize') {
                if (startRect.left === rect.left) {
                    document.Scheduler.isBookingOk = true;
                    const { start, end } = getStartEndDate(bookingCache[0], bookingCache[bookingCache.length-1]);

                    if (bookingCache[0] === resizeCache[0] &&
                        bookingCache[bookingCache.length-1] === resizeCache[resizeCache.length-1])
                        return; // Nothing changed

                    if (onBookingUpdated) {
                        if (await onBookingUpdated(start, end)) {
                            bookedTimes[bookingState.bookingIdx].start = start;
                            bookedTimes[bookingState.bookingIdx].end = end;
                            bookingCache[0].className += ' sched-start';
                            bookingCache[bookingCache.length-1].className += ' sched-end';
                        } else {
                            restoreOriginalBooking(bookingCache, resizeCache);
                        }
                    }

                    resetState();
                }
            }
        }
    }

    window.bookedTimes = bookedTimes;

    useEffect(()=>{
        if (timeGridEntries.length > 0) {
            console.log(">>> Adding Outside Grid Listener");
            document.addEventListener('mouseup',(e)=>{
                const { isBookingOk, action, bookingCache, resizeCache } = document.Scheduler.bookingState;
                if (!isBookingOk &&
                    action !== 'delete' &&
                    action !== 'resize'
                ){
                    console.log(">>> Resetting selection");
                    removeBooking(bookingCache);
                    resetState();
                } else if (action==='resize') {
                    restoreOriginalBooking(bookingCache, resizeCache);
                    resetState();
                }
            });
        }
    }, [timeGridEntries]);

    useEffect(()=> {
        console.log(">>> Rending Time Grid Entries ")
        setTimeGridEntries(
            generateTimeGridEntries(
                numOfHours,
                bookingBlockSize,
                daysOfWeek,
                hrSegments,
                date
            )
        );
    },[date]);

    useEffect(()=>{
        if (timeGridEntries.length > 0) {
            console.log(">>> Setting Booked Dates ");
            booked.forEach((item, idx) => {
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
    }, [timeGridEntries, booked]);

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