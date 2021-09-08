import './App.css';
import React from 'react';
import Scheduler from './component/Scheduler';

/*
const numOfHours = 24;
const bookingBlockSize = 15;
const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const hrSegments = Math.ceil(60/bookingBlockSize);
const ampm = ['AM','PM'];
let timeContainer = null;
let ampmIdx = 0;


*/
function App() {
  const scheduledData = [
    {
        start:new Date('2021-09-15T11:00:00.00Z'),
        end:  new Date('2021-09-15T12:00:00.00Z'),
        info: {
          Attendee: "Joseph King"
        }
    },
    {
        start:new Date('2021-09-14T14:15:00.00Z'),
        end:  new Date('2021-09-14T15:00:00.00Z'),
    },
    {
        start:new Date('2021-09-06T13:00:00.00Z'),
        end:  new Date('2021-09-06T13:45:00.00Z'),
        info: {
          Attendee: "Somebody"
        }
    },
    {
        start:new Date('2021-09-07T10:30:00.00Z'),
        end:  new Date('2021-09-07T11:15:00.00Z'),
        info: {
          Attendee: "Employee of the year"
        }
    },
    {
        start:new Date('2021-09-06T12:00:00.00Z'),
        end:  new Date('2021-09-06T12:45:00.00Z'),
    },
    {
      start:new Date('2021-09-06T10:00:00.00Z'),
      end:  new Date('2021-09-06T10:45:00.00Z'),
    },
];

  return (
    <div className="App">
      <header className="App-header">
      <Scheduler 
        scheduledData={scheduledData}
        onBookingSelected={(startDate, endDate) => {
          alert('Booking ' + startDate + ' - ' + endDate);
          return Promise.resolve(true);
        }}
        onDeleteBooking={(startDate, endDate) => {
          alert('Deleting ' + startDate + '- ' + endDate);
          return Promise.resolve(true);
        }}
        onBookingUpdated={(startDate, endDate) => {
          alert('Re-scheduling to ' + startDate + ' - ' + endDate)
          return Promise.resolve(true);
        }}
        onShowMonth={(start, end)=>{
          console.log("FROM APP ========",start, end);
          return Promise.resolve({
            start: start,
            end: end,
            data: [
              {
                start:new Date('2021-09-06T10:00:00.00Z'),
                end:  new Date('2021-09-06T10:45:00.00Z'),
              },
            ]
          });
        }}
      />
      </header>
    </div>
  );
}

export default App;
