export function customLog(title = 'console group title', text = '', color = 'aqua') {
    console.group(`%c ${title}`, `font-size: 13px; color: ${color}; border: 1px solid ${color};`);
    console.info(`%c ${text}`, `margin-left: 15px;`);
    console.groupEnd();
}
