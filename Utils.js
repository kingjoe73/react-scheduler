const today = new Date();
export const isDateToday = (dt) => {
    return (today.getFullYear() === dt.getFullYear() &&
            today.getMonth() === dt.getMonth() &&
            today.getDate() === dt.getDate());
}

export const makeItSunday = (dt) => dt.getDay()===0 ? dt : dt.setTime(dt.getTime()-(dt.getDay()*86400000));
export const makeItSaturday = (dt) => dt.getDay()===6 ? dt : dt.setTime(dt.getTime()+((6-dt.getDay())*86400000));

export const getStartDate = () => {
    const today = new Date();
    makeItSunday(today);
    return today;
}

