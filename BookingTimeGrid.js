import React, { useRef, useEffect, useState } from 'react';


const generateTimeGridEntries = (numOfHours, bookingBlockSize, daysOfWeek, hrSegments, date) => {
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
            startTime = (startTime || hh+"00");

            let endTime = ('0'+hr).slice(-2)+('0'+min).slice(-2);
            if (i%hrSegments === 0) {
                min = 0;
                if (hr < 23) {
                    hr = hr%23+1;
                } else {
                    hr = 0;
                }
            }
            endTime = ('0'+hr).slice(-2)+('0'+min).slice(-2);

            const stdt = ('0'+(dt.getMonth()+1)).slice(-2)+
                         ('0'+dt.getDate()).slice(-2)+
                         dt.getFullYear();

            colEntries.push(
                <div stdt={stdt} stime={startTime} etime={endTime} key={`${stdt}_${startTime}`}>
                    <span className='delete'></span><span className='resize'></span>
                </div>
            );

            startTime = endTime;
            min += bookingBlockSize;
        }

        dt.setDate(dt.getDate()+1);
        retVal.push(<div className='grid-entries' key={dow+idx}>{colEntries}</div>);
    })

    return retVal;
}

const setBookedCells = (nodes, booking, popupRef) => {
    if (nodes.length > 0) {
        let elem = nodes[0];
        let showToolTip = (x,y)=>{
            popupRef.current.innerHTML = 
                    `Start: ${booking.start}` +
                    `End: ${booking.end}` +
                    `Attendee: ${booking.attendee}`;
            popupRef.current.style.display = 'block';
            popupRef.current.style.top = (y+10)+'px';
            popupRef.current.style.left = (x)+'px';
        }

        do {
            elem.addEventListener('mouseover', (e)=>{
                showToolTip(e.clientX, e.clientY);
            });
            elem.addEventListener('mouseout', (e)=>{
                popupRef.current.style.display = '';
            });

            elem.className += ' booked';
            elem = elem.nextElementSibling;

        } while(elem != nodes[nodes.length-1]);

        nodes[0].className += ' sched-start'
        nodes[nodes.length-1].className += ' booked sched-end';
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
    const stDt = sElem.getAttribute('stdt');
    const sTime = sElem.getAttribute('stime');
    const eTime = eElem.getAttribute('etime');

    const sDt = new Date(`${stDt.substr(0,2)}-${stDt.substr(2,2)}-${stDt.substr(4)}`);
    const eDt = new Date(`${stDt.substr(0,2)}-${stDt.substr(2,2)}-${stDt.substr(4)}`);

    sDt.setHours(sTime.substr(0,2),sTime.substr(2,2),0);
    eDt.setHours(eTime.substr(0,2),eTime.substr(2,2),0);

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
                ...findBookedBlock(e.target.parentElement, 'sched-end')
            })

        } else if (resize) {
            let props = findBookedBlock(e.target.parentElement, 'sched-start');

            props.bookingCache[0].className = 'booked';
            props.bookingCache[props.bookingCache.length-1].className = 'booked';

            setBookingState({
                action:'resize',
                ...props,
                resizeCache: props.bookingCache.map(i=>i)
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
                    action: action,
                    bookingCache: bookingCache || [],
                    startElem: startElem || e.target,
                    endElem: e.target,
                    resizeCache: resizeCache
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
                            // TODO: Update set bookings
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
            booked.forEach((item) => {
                let sdt = new Date(item.start);
                let edt = new Date(item.end);

                let dtstr = ('0'+(sdt.getMonth()+1)).slice(-2)+
                            ('0'+sdt.getDate()).slice(-2)+
                             sdt.getFullYear();

                let sTime = ('0'+sdt.getHours()).slice(-2)+('0'+sdt.getMinutes()).slice(-2);
                let eTime = ('0'+edt.getHours()).slice(-2)+('0'+edt.getMinutes()).slice(-2);

                const nodes = gridRef.current.querySelectorAll(`[stdt="${dtstr}"][stime="${sTime}"],[stdt="${dtstr}"][etime="${eTime}"]`);
                setBookedCells(nodes, item, popupRef);
            })

            const rect = gridRef.current.querySelector('[stime="0900"]').getBoundingClientRect();
            gridRef.current.scrollBy(0,rect.top-gridRef.current.offsetTop+2)
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