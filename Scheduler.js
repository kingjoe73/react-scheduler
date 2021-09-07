import React, { useEffect, useRef, useState } from 'react';
import BookingTimeGrid from './BookingTimeGrid';
import './scheduler.css';

const getStartDate = () => {
    const today = new Date();
    today.setTime(today.getTime()-(today.getDay()*86400000)); // Start on a Sunday
    return today;
}

const generateDowHeadings = (daysOfWeek, date) => {
    const today = new Date();
    const retVal = [];
    const dt = new Date();
    dt.setTime(date.getTime());

    daysOfWeek.forEach((dow,idx) => {
        let isToday = (today.getFullYear() === dt.getFullYear() && 
                       today.getMonth() === dt.getMonth() &&
                       today.getDate() === dt.getDate()) ;

        const content = `${dt.toLocaleDateString('en-us',{day:'2-digit'})}-${dow}`;
        if (isToday) {
            retVal.push(<span className={'today'} key={idx}>{content}</span>);
        } else {
            retVal.push(<span key={idx}>{content}</span>);
        }

        dt.setDate(dt.getDate()+1);
    });
    retVal.push(<span key={-1}>&nbsp;</span>);
    return retVal;
}


const generateTimeEntries = (numOfHours, hrSegments) => {
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


const WeekNavigator = (props) => {
    const { date, onNavigate, onResetToday } = props;

    let sDt = new Date();
    let eDt = new Date();

    sDt.setTime(date.getTime());
    eDt.setTime(date.getTime());

    if (sDt.getDay() !== 0) {
        sDt.setTime(sDt.getTime()-(sDt.getDay()*86400000));
    }

    if (eDt.getDay() !== 6) {
        eDt.setTime(eDt.getTime()+((6-eDt.getDay())*86400000));
    }
    
    let mmStr = sDt.toLocaleDateString('en-us',{month:'long'});
    let ddStr = sDt.toLocaleDateString('en-us',{day:'2-digit'}) + ' - ' +
                eDt.toLocaleDateString('en-us',{day:'2-digit'}) + ' ';

    const prevClick = () => {
        sDt.setDate(sDt.getDate()-7);
        onNavigate && onNavigate(sDt);
    }

    const nextClick = () => {
        sDt.setDate(sDt.getDate()+7);
        onNavigate && onNavigate(sDt);
    }

    return (
        <div className="date-nav">
            <span className="date-info">{mmStr} {ddStr}, {sDt.getFullYear()}</span>
            <div className="button-container">
                <button className='prev' onClick={prevClick}></button>
                <button onClick={()=>{onResetToday&&onResetToday()}}>Today</button>
                <button className='next' onClick={nextClick}></button>
            </div>
        </div>
    )
}

const Scheduler = (props) => {
    const { bookedTimes, onBookingSelected, onDeleteBooking, onBookingUpdated } = props;
    const bookingBlockSize = props.bookingBlockSize||15;
    const dowParam = props.daysOfWeek||['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const numOfHours = props.numOfHours||24;

    const [ dt, setDate ] = useState(getStartDate());
    const dowHeadingRef = useRef();
    const timeContainerRef = useRef();
    const hrSegments = Math.ceil(60/bookingBlockSize);

    const scrollHandler = (e) => {
        timeContainerRef.current.scroll(0, e.target.scrollTop+0.1);
        dowHeadingRef.current.scroll(e.target.scrollLeft+0.1, 0);
    }

    return (
        <div className="scheduler">
            <style dangerouslySetInnerHTML={{__html: `
                .time-container div:nth-child(${hrSegments}n) + div,
                .grid-entries div:nth-child(${hrSegments}n) + div {
                    border-top:1px solid black;
                }
            `}} />
    
            <WeekNavigator date={dt} 
                           onNavigate={(newDate)=>{setDate(newDate)}} 
                           onResetToday={()=>{setDate(getStartDate())}}/>

            <div className="msc">
                <div className="heading">
                    <div className="time-heading">&nbsp;</div>
                    <div className="dow-heading" ref={dowHeadingRef}>{generateDowHeadings(dowParam, dt)}</div>
                </div>
                <div className="scheduler-container">
                    <div className="time-container" ref={timeContainerRef} >{generateTimeEntries(numOfHours, hrSegments)}</div>

                    <BookingTimeGrid 
                        numOfHours={numOfHours}  
                        bookingBlockSize={bookingBlockSize} 
                        daysOfWeek={dowParam} 
                        hrSegments={hrSegments} 
                        date={dt} 
                        scrollHandler={scrollHandler}
                        bookedTimes={bookedTimes}
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