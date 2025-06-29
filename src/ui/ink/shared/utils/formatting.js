export function formatPosition(position, units = 'mm', precision = 3) {
  const { x = 0, y = 0, z = 0 } = position;
  const unitSuffix = units === 'mm' ? 'mm' : 'in';
  
  return {
    x: `${x.toFixed(precision)}${unitSuffix}`,
    y: `${y.toFixed(precision)}${unitSuffix}`,
    z: `${z.toFixed(precision)}${unitSuffix}`,
    formatted: `X:${x.toFixed(precision)} Y:${y.toFixed(precision)} Z:${z.toFixed(precision)} (${unitSuffix})`
  };
}

export function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatSpeed(speed, units = 'mm') {
  const unitSuffix = units === 'mm' ? 'mm/min' : 'in/min';
  return `${speed.toFixed(0)} ${unitSuffix}`;
}

export function formatRpm(rpm) {
  return `${rpm.toFixed(0)} RPM`;
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatPercentage(value, precision = 1) {
  return `${value.toFixed(precision)}%`;
}

export function truncateText(text, maxLength = 50) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function padCenter(text, width, fillChar = ' ') {
  if (text.length >= width) return text;
  
  const padding = width - text.length;
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  
  return fillChar.repeat(leftPad) + text + fillChar.repeat(rightPad);
}

export function createBox(content, width = 60, title = null) {
  const horizontalLine = '─'.repeat(width - 2);
  const topLine = `┌${title ? `─ ${title} ─` : horizontalLine}┐`;
  const bottomLine = `└${horizontalLine}┘`;
  
  const lines = content.split('\n');
  const contentLines = lines.map(line => {
    const paddedLine = line.padEnd(width - 4);
    return `│ ${paddedLine} │`;
  });
  
  return [topLine, ...contentLines, bottomLine].join('\n');
}