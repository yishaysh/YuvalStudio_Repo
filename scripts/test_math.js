// Test slotTime overlaps
const date = new Date("2026-03-08T00:00:00.000Z"); // Midnight UTC == 02:00 local Israel
console.log("Date object:", date.toString());

const tzOffsetMs = date.getTimezoneOffset() * 60000;
console.log("Timezone Offset:", date.getTimezoneOffset());

// Simulate an appointment from 15:00 to 15:30 Israel time
const appStart = new Date(date);
appStart.setHours(15, 0, 0, 0);
const appEnd = new Date(appStart.getTime() + 30 * 60000);
console.log("App Start:", appStart.toISOString());
console.log("App End:", appEnd.toISOString());

const busyRanges = [{
    start: appStart.getTime(),
    end: appEnd.getTime()
}];

const checkSlot = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const slotDate = new Date(date);
    slotDate.setHours(h, m, 0, 0);
    const slotTime = slotDate.getTime();

    const isBusy = busyRanges.some(range => slotTime >= range.start && slotTime < range.end);
    console.log(`Slot ${timeStr}: slotTime=${slotTime}, isBusy=${isBusy}`);
};

checkSlot("14:30");
checkSlot("15:00");
checkSlot("15:30");
checkSlot("16:00");
