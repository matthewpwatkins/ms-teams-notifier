import { parseCalendarEventFromOutlookEventTitle, parseCalendarEventFromTeamsEventTitle } from "../event-parser";

describe('parseCalendarEventFromnTeamsEventTitle', () => {
  test('All-day event', () => {
    const event = parseCalendarEventFromTeamsEventTitle('All day event, Luke - OOO - Vacation, Sunday, December 22, 2024 to Monday, December 23, 2024, organized by Luke Skywalker', 'EST');
    expect(event.id).toBe('2024-12-22|Luke - OOO - Vacation');
    expect(event.title).toBe('Luke - OOO - Vacation');
    expect(event.isCanceled).toBe(false);
    expect(event.isAllDay).toBe(true);
    expect(event.start.toISOString()).toEqual('2024-12-22T05:00:00.000Z');
    expect(event.end.toISOString()).toEqual('2024-12-24T04:59:00.000Z');
  });

  test('Single-day event', () => {
    const event = parseCalendarEventFromTeamsEventTitle('Stormtrooper Standup, Friday, December 27, 2024 10:20 AM to 10:40 AM, location: Microsoft Teams Meeting, organized by Darth Vader, Recurring meeting', 'EST');
    expect(event.id).toBe('2024-12-27|Stormtrooper Standup');
    expect(event.title).toBe('Stormtrooper Standup');
    expect(event.isCanceled).toBe(false);
    expect(event.isAllDay).toBe(false);
    expect(event.start.toISOString()).toEqual('2024-12-27T15:20:00.000Z');
    expect(event.end.toISOString()).toEqual('2024-12-27T15:40:00.000Z');
  });

  test('Canceled event', () => {
    const event = parseCalendarEventFromTeamsEventTitle('Canceled: Stormtrooper Standup, Friday, December 27, 2024 10:20 AM to 10:40 AM, location: Microsoft Teams Meeting, organized by Darth Vader, Recurring meeting', 'EST');
    expect(event.id).toBe('2024-12-27|Stormtrooper Standup');
    expect(event.title).toBe('Stormtrooper Standup');
    expect(event.isCanceled).toBe(true);
    expect(event.isAllDay).toBe(false);
    expect(event.start.toISOString()).toEqual('2024-12-27T15:20:00.000Z');
    expect(event.end.toISOString()).toEqual('2024-12-27T15:40:00.000Z');
  });

  test('Overnight event', () => {
    const event = parseCalendarEventFromTeamsEventTitle('Tatooine Overnight Camping Trip\nfrom Monday, December 23, 2024 3:00 PM to Tuesday, December 24, 2024 1:00 PM', 'EST');
    expect(event.id).toBe('2024-12-23|Tatooine Overnight Camping Trip');
    expect(event.title).toBe('Tatooine Overnight Camping Trip');
    expect(event.isCanceled).toBe(false);
    expect(event.isAllDay).toBe(false);
    expect(event.start.toISOString()).toEqual('2024-12-23T20:00:00.000Z');
    expect(event.end.toISOString()).toEqual('2024-12-24T18:00:00.000Z');
  });
});

describe('parseCalendarEventFromOutlookEventTitle', () => {
  test('V2 Outlook - All-day event', () => {
    const event = parseCalendarEventFromOutlookEventTitle('ABC123', 'Moff OOO, all day event, Monday, December 30, 2024, By Moff Tarkin, Free', 'EST');
    expect(event.id).toBe('ABC123');
    expect(event.title).toBe('Moff OOO');
    expect(event.isCanceled).toBe(false);
    expect(event.isAllDay).toBe(true);
    expect(event.start.toISOString()).toEqual('2024-12-30T05:00:00.000Z');
    expect(event.end.toISOString()).toEqual('2024-12-31T04:59:00.000Z');
  });
});

// describe('parseCalendarEventFromV2CalendarEventCard', () => {
//   test('should parse a simple event title', () => {
//     const title = "Helmet polishing, 10:30 AM to 10:35 AM, Monday, December 23, 2024, Busy";
//     const event = parseCalendarEventFromOutlookCalendarEventCard(title, 'EST');

//     expect(event.title).toBe('Helmet polishing');
//     expect(event.isCanceled).toBe(false);
//     expect(event.isAllDay).toBe(false);
//     expect(event.start.toISOString()).toEqual('2024-12-23T15:30:00.000Z');
//     expect(event.end.toISOString()).toEqual('2024-12-23T15:35:00.000Z');
//   });

//   test('should parse a detailed event title', () => {
//     const title = "Stormtrooper Standup, 10:20 AM to 10:40 AM, Monday, December 23, 2024, Microsoft Teams Meeting, By Darth Vader, Tentative, Recurring event";
//     const event = parseCalendarEventFromOutlookCalendarEventCard(title, 'EST');

//     expect(event.title).toBe('Stormtrooper Standup');
//     expect(event.isCanceled).toBe(false);
//     expect(event.isAllDay).toBe(false);
//     expect(event.start.toISOString()).toEqual('2024-12-23T15:20:00.000Z');
//     expect(event.end.toISOString()).toEqual('2024-12-23T15:40:00.000Z');
//   });

//   test('should parse an all-day event title', () => {
//     const title = "Moff Tarkin - OOO - Vacation, all day event, Thursday, November 21, 2024 to Friday, November 29, 2024, By Benjamin Bruce Hafen, Free";
//     const event = parseCalendarEventFromOutlookCalendarEventCard(title, 'EST');

//     expect(event.title).toBe('Moff Tarkin - OOO - Vacation');
//     expect(event.isCanceled).toBe(false);
//     expect(event.isAllDay).toBe(true);
//     expect(event.start.toISOString()).toEqual('2024-11-21T05:00:00.000Z');
//     expect(event.end.toISOString()).toEqual('2024-11-30T04:59:00.000Z');
//   });

//   test('should parse a single-day all-day event title', () => {
//     const title = "Moff Tarkin out for Life Day, all day event, Wednesday, November 27, 2024, By Gary King, Free";
//     const event = parseCalendarEventFromOutlookCalendarEventCard(title, 'EST');

//     expect(event.title).toBe('Moff Tarkin out for Life Day');
//     expect(event.isCanceled).toBe(false);
//     expect(event.isAllDay).toBe(true);
//     expect(event.start.toISOString()).toEqual('2024-11-27T05:00:00.000Z');
//     expect(event.end.toISOString()).toEqual('2024-11-28T04:59:00.000Z');
//   });
// });
