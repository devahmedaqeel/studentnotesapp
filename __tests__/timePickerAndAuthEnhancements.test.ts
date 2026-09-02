import { timetableService } from '../src/services/timetableService';

describe('Time Format Normalization & 12-Hour AM/PM Conversions', () => {
  it('normalizes single numbers and partial time strings properly', () => {
    expect(timetableService.normalizeTime('10')).toBe('10:00');
    expect(timetableService.normalizeTime('9')).toBe('09:00');
    expect(timetableService.normalizeTime('9:30')).toBe('09:30');
    expect(timetableService.normalizeTime('9:5')).toBe('09:05');
    expect(timetableService.normalizeTime('14:45')).toBe('14:45');
  });

  it('correctly parses and normalizes 12-hour AM/PM string inputs', () => {
    expect(timetableService.normalizeTime('9:00 AM')).toBe('09:00');
    expect(timetableService.normalizeTime('1:30 PM')).toBe('13:30');
    expect(timetableService.normalizeTime('12:00 AM')).toBe('00:00');
    expect(timetableService.normalizeTime('12:00 PM')).toBe('12:00');
    expect(timetableService.normalizeTime('11:59 PM')).toBe('23:59');
  });

  it('converts 24-hour time to 12-hour AM/PM display cleanly', () => {
    expect(timetableService.formatTime12('09:00', true)).toBe('09:00 AM');
    expect(timetableService.formatTime12('13:30', true)).toBe('01:30 PM');
    expect(timetableService.formatTime12('23:59', true)).toBe('11:59 PM');
    expect(timetableService.formatTime12('00:00', true)).toBe('12:00 AM');
    expect(timetableService.formatTime12('12:00', true)).toBe('12:00 PM');
  });

  it('converts 12-hour components back into 24-hour HH:mm string', () => {
    expect(timetableService.to24HourString(9, 0, 'AM')).toBe('09:00');
    expect(timetableService.to24HourString(1, 30, 'PM')).toBe('13:30');
    expect(timetableService.to24HourString(12, 0, 'AM')).toBe('00:00');
    expect(timetableService.to24HourString(12, 0, 'PM')).toBe('12:00');
    expect(timetableService.to24HourString(11, 59, 'PM')).toBe('23:59');
  });

  it('accurately parses 24-hour time into 12-hour components', () => {
    const morning = timetableService.to12HourComponents('09:30');
    expect(morning.hour).toBe(9);
    expect(morning.minute).toBe(30);
    expect(morning.period).toBe('AM');

    const evening = timetableService.to12HourComponents('21:45');
    expect(evening.hour).toBe(9);
    expect(evening.minute).toBe(45);
    expect(evening.period).toBe('PM');
  });

  it('calculates class durations accurately without 15-hour anomalies', () => {
    // 9:00 AM to 10:00 AM
    expect(timetableService.calculateDuration('09:00', '10:00')).toBe('1 hour');
    // If user enters '10' for end time, it normalizes to '10:00' and calculates 1 hour
    expect(timetableService.calculateDuration('09:00', '10')).toBe('1 hour');
    // 9:30 AM to 11:00 AM
    expect(timetableService.calculateDuration('09:30', '11:00')).toBe('1 hr 30 mins');
    // 2:00 PM to 4:30 PM (14:00 to 16:30)
    expect(timetableService.calculateDuration('14:00', '16:30')).toBe('2 hr 30 mins');
  });
});
