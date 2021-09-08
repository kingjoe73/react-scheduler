import React, { useEffect, useRef, useState } from 'react';
import BookingTimeGrid from './BookingTimeGrid';
import MonthViewGrid from './MonthViewGrid';
import { isDateToday, getStartDate, makeItSaturday, makeItSunday  } from './Utils';
import './scheduler.css';



const generateDowHeadings = (daysOfWeek, date, isMonthView) => {
    const retVal = [];
    const dt = new Date();
    dt.setTime(date.getTime());

    if (!isMonthView) {
        makeItSunday(dt);
    }

    daysOfWeek.forEach((dow,idx) => {
        let content = `${dt.toLocaleDateString('en-us',{day:'2-digit'})}-${dow}`;
        let isToday = false;

        if (isMonthView) {
            content = dow;
        } else {
            isToday = isDateToday(dt);
        }

        if (isToday) {
            retVal.push(<span className={'today'} key={idx}>{content}</span>);
        } else {
            retVal.push(<span key={idx}>{content}</span>);
        }

        dt.setDate(dt.getDate()+1);
    });

    if (!isMonthView)
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
        makeItSunday(sDt);
        makeItSaturday(eDt);
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
    const { scheduledData, monthlyData, onBookingSelected, onDeleteBooking, onBookingUpdated, onShowMonth } = props;
    const schedBlockSize = props.schedBlockSize||15;
    const dowParam = props.daysOfWeek||['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const numOfHours = props.numOfHours||24;

    const [ date, setDate ] = useState(getStartDate());
    const [ showMonth, setShowMonth ] = useState(false);
    const [ monthData, setMonthData ] = useState(monthlyData);
    const [ monthViewDates, setMonthViewDates ] = useState({start:null, end:null});
    const dowHeadingRef = useRef();
    const timeContainerRef = useRef();
    const hrSegments = Math.ceil(60/schedBlockSize);

    const scrollHandler = (e) => {
        timeContainerRef.current.scroll(0, e.target.scrollTop+0.1);
        dowHeadingRef.current.scroll(e.target.scrollLeft+0.1, 0);
    }

    const getMonthViewDates = () => {
        let start = new Date(date.getFullYear(),date.getMonth(),1);
        let end = new Date(date.getFullYear(),date.getMonth()+1,0);
        let numberOfDays = end.getDate();

        let sDay = start.getDay();
        let eDay = end.getDay();
        if (sDay !== 0) {
            numberOfDays += sDay;
            makeItSunday(start);
        }
        if (eDay !== 6) {
            numberOfDays += (6-eDay);
            makeItSaturday(end);
        }
        return {start,end,numberOfDays};
    }

    const toggleMonthWkView = (isMonthView) => {
        if (isMonthView) {
            setShowMonth(true);
            setMonthViewDates(getMonthViewDates());
        } else {
            setShowMonth(false);
        }
    }

    useEffect(()=> {
        if (showMonth) {
            setMonthViewDates(getMonthViewDates());
        }
    }, [date]);

    useEffect(async ()=>{
        if (!showMonth) return;
        if (monthViewDates.start) {
            const data = await onShowMonth(monthViewDates.start, monthViewDates.end);
            if (data) {
                setMonthData(data);
            }
        }
    }, [monthViewDates]);

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

            <div className={`msc ${showMonth?'month-view':''}`}>
                <div className="heading">
                    {!showMonth && <div className="time-heading">&nbsp;</div> }
                    <div className="dow-heading" ref={dowHeadingRef}>{generateDowHeadings(dowParam, date, showMonth)}</div>
                </div>
                {
                    showMonth &&
                    <MonthViewGrid
                        currentDate={date}
                        monthData={monthData}
                        {...monthViewDates}
                    />
                }
                {
                    !showMonth &&
                    <div className="scheduler-container">
                        <div className="time-container" ref={timeContainerRef} >{generateTimeEntries(numOfHours, hrSegments, showMonth)}</div>
                        <BookingTimeGrid
                            numOfHours={numOfHours}
                            schedBlockSize={schedBlockSize}
                            daysOfWeek={dowParam}
                            hrSegments={hrSegments}
                            date={date}
                            scrollHandler={scrollHandler}
                            scheduledData={scheduledData}
                            onBookingSelected={onBookingSelected}
                            onDeleteBooking={onDeleteBooking}
                            onBookingUpdated={onBookingUpdated}
                        />
                    </div>
                }
            </div>
        </div>
    )
}

export default Scheduler;