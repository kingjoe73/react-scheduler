import React, { useEffect, useRef, useState } from 'react';
import BookingTimeGrid from './BookingTimeGrid';
import './scheduler.css';

const getStartDate = () => {
    const today = new Date();
    today.setTime(today.getTime()-(today.getDay()*86400000)); // Start on a Sunday
    return today;
}

const generateDowHeadings = (daysOfWeek, date, isMonthView) => {
    const today = new Date();
    const retVal = [];
    const dt = new Date();
    dt.setTime(date.getTime());

    if (!isMonthView) {
        if (dt.getDay() !== 0) {
            dt.setTime(dt.getTime()-(dt.getDay()*86400000));
        }
    }

    daysOfWeek.forEach((dow,idx) => {
        let isToday = (today.getFullYear() === dt.getFullYear() &&
                       today.getMonth() === dt.getMonth() &&
                       today.getDate() === dt.getDate()) ;

        let content = `${dt.toLocaleDateString('en-us',{day:'2-digit'})}-${dow}`;
        if (isMonthView) {
            content = dow;
        }
        if (isToday && !isMonthView) {
            retVal.push(<span className={'today'} key={idx}>{content}</span>);
        } else {
            retVal.push(<span key={idx}>{content}</span>);
        }

        dt.setDate(dt.getDate()+1);
    });
    retVal.push(<span key={-1}>&nbsp;</span>);
    return retVal;
}


const generateTimeEntries = (numOfHours, hrSegments, isMonthView) => {
    const retVal = [];
    const ampm = ['AM','PM'];
    let ampmIdx = 0;
    let hr = 12;

    for(let i = 0; i < numOfHours; i++) {
        for(let j = 0; j < hrSegments; j++) {
            if (j === 0) {
                let hh = ('0'+hr).slice(-2);
                retVal.push(<div key={`${i}_${j}`}>{hh+':00 ' + ampm[ampmIdx]}</div>)
            } else {
                retVal.push(<div key={`${i}_${j}`}/>);
            }

            if (j === hrSegments-2) {
                hr = hr%12+1;
                if (hr === 12) {
                    ampmIdx ^= 1;
                }
            }
        }
    }
    retVal.push(<div key={Date.now()} className={'time-padding'}/>);
    return retVal;
}


const DateNavigator = (props) => {
    const { date, isMonthView, onNavigate, onResetToday, onToggleDisplay } = props;

    let sDt = new Date();
    let eDt = new Date();

    sDt.setTime(date.getTime());
    eDt.setTime(date.getTime());

    if (!isMonthView) {
        if (sDt.getDay() !== 0) {
            sDt.setTime(sDt.getTime()-(sDt.getDay()*86400000));
        }

        if (eDt.getDay() !== 6) {
            eDt.setTime(eDt.getTime()+((6-eDt.getDay())*86400000));
        }
    }

    let mmStr = sDt.toLocaleDateString('en-us',{month:'long'});
    let ddStr = sDt.toLocaleDateString('en-us',{day:'2-digit'}) + ' - ' +
                eDt.toLocaleDateString('en-us',{day:'2-digit'}) + ' ';

    const prevClick = () => {
        if (isMonthView) {
            sDt.setMonth(sDt.getMonth()-1);
        } else {
            sDt.setDate(sDt.getDate()-7);
        }
        onNavigate && onNavigate(sDt);
    }

    const nextClick = () => {
        if (isMonthView) {
            sDt.setMonth(sDt.getMonth()+1);
        } else {
            sDt.setDate(sDt.getDate()+7);
        }
        onNavigate && onNavigate(sDt);
    }

    const toggleView = () => {
        onToggleDisplay && onToggleDisplay(!isMonthView);
    }

    let dateStr = `${mmStr} ${sDt.getFullYear()}`;
    if (!isMonthView) {
        dateStr = `${mmStr} ${ddStr}, ${sDt.getFullYear()}`;
    }

    return (
        <div className="date-nav">
            <span className="button-container">
                <button className='prev' onClick={prevClick}></button>
                <button onClick={()=>{onResetToday&&onResetToday()}}>Today</button>
                <button className='next' onClick={nextClick}></button>
            </span>
            <span className={`date-info ${isMonthView?'month-view':''}`}>{dateStr}</span>
            <button className='show-month' onClick={toggleView}>{isMonthView ? "Show Week":"Show Month"}</button>
        </div>
    )
}

const Scheduler = (props) => {
    const { bookedTimes, monthlyData, onBookingSelected, onDeleteBooking, onBookingUpdated, onShowMonth } = props;
    const bookingBlockSize = props.bookingBlockSize||15;
    const dowParam = props.daysOfWeek||['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const numOfHours = props.numOfHours||24;

    const [ date, setDate ] = useState(getStartDate());
    const [ showMonth, setShowMonth ] = useState(false);
    const [ monthData, setMonthData ] = useState(monthlyData);
    const dowHeadingRef = useRef();
    const timeContainerRef = useRef();
    const hrSegments = Math.ceil(60/bookingBlockSize);

    const scrollHandler = (e) => {
        timeContainerRef.current.scroll(0, e.target.scrollTop+0.1);
        dowHeadingRef.current.scroll(e.target.scrollLeft+0.1, 0);
    }

    const toggleMonthWkView = async(isMonthView) => {
        let newDt = new Date();
        newDt.setTime(date.getTime());

        if (isMonthView) {
            newDt.setDate(1);
        } else {
            if (newDt.getDay() !== 0) {
                newDt.setTime(newDt.getTime()-(newDt.getDay()*86400000));
            }
        }


        setDate(newDt);
        setShowMonth(isMonthView);

        if (isMonthView && onShowMonth) {
            const start = new Date(newDt.getTime())
            const end = new Date(start.getFullYear(), start.getMonth()+1, 0);

            if (start.getDay() !== 0) {
                start.setTime(start.getTime()-(start.getDay()*86400000));
            }
            if (end.getDay() !== 6) {
                end.setTime(end.getTime()+((6-end.getDay())*86400000));
            }
    

            const data = await onShowMonth(start, end);
            if (data) {
                setMonthData(data);
            }
        }
    }

    return (
        <div className="scheduler">
            <style dangerouslySetInnerHTML={{__html: `
                .time-container div:nth-child(${hrSegments}n) + div,
                .grid-entries div:nth-child(${hrSegments}n) + div {
                    border-top:1px solid black;
                }
            `}} />

            <DateNavigator date={date}
                           isMonthView={showMonth}
                           onNavigate={(newDate)=>{setDate(newDate)}}
                           onToggleDisplay={toggleMonthWkView}
                           onResetToday={()=>{setDate(getStartDate())}}/>

            <div className="msc">
                <div className="heading">
                    <div className="time-heading">&nbsp;</div>
                    <div className="dow-heading" ref={dowHeadingRef}>{generateDowHeadings(dowParam, date, showMonth)}</div>
                </div>
                <div className="scheduler-container">
                    <div className="time-container" ref={timeContainerRef} >{generateTimeEntries(numOfHours, hrSegments, showMonth)}</div>

                    <BookingTimeGrid
                        numOfHours={numOfHours}
                        bookingBlockSize={bookingBlockSize}
                        daysOfWeek={dowParam}
                        hrSegments={hrSegments}
                        date={date}
                        scrollHandler={scrollHandler}
                        bookedTimes={bookedTimes}
                        monthlyData={monthData}
                        onBookingSelected={onBookingSelected}
                        onDeleteBooking={onDeleteBooking}
                        onBookingUpdated={onBookingUpdated}
                    />
                </div>
            </div>
        </div>
    )
}

export default Scheduler;