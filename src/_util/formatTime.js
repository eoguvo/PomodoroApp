export default function formatTime(totalSeconds) {
    const min = (totalSeconds / 60)>>0;
    const sec = (totalSeconds % 60)>>0;
    return `${min>10?min:'0'+min}:${sec>10?sec:'0'+sec}`
}