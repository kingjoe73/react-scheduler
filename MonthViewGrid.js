import { isDateToday } from "./Utils";

const MonthViewGrid = (props) => {
    const { start, end, numberOfDays, currentDate } = props;

    const generateDateEntries = () => {
        let dt = new Date();
        dt.setTime(start.getTime());

        let retVal = [[],[],[],[],[],[],[]];
        let days = 0;

        do {
            for(let col=0; col < 7; col++, days++) {
                let cssClass = {};
                if (dt.getMonth() !== currentDate.getMonth()) {
                    cssClass = {className:'not-current-month'};
                }
                if (isDateToday(dt)) {
                    cssClass.className += ' today';
                }

                retVal[col].push(<div {...cssClass} key={`day_${days}_${col}`}>{dt.toLocaleDateString('en',{month:'short',day:'2-digit'})}</div>)
                dt.setDate(dt.getDate()+1);
            }
        } while(days < numberOfDays);

        return retVal.map((items,idx) => {
            return <div className='month-grid-col' key={`dow_${idx}`}>{items}</div>;
        });
    }

    return (
        <div className='month-grid-container'>
            {generateDateEntries()}
        </div>
    );
}

export default MonthViewGrid;