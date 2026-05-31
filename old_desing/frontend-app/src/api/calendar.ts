import { api } from "./client";
import type { CalendarEvent, CalendarEventType } from "./types";

export interface ListEventsParams {
  from?: string;
  to?: string;
  type?: CalendarEventType;
  student_id?: string;
}

export async function listEvents(params: ListEventsParams = {}): Promise<CalendarEvent[]> {
  const { data } = await api.get<{ items: CalendarEvent[] }>("/me/calendar", { params });
  return data.items ?? [];
}

export interface CreateEventDto {
  title: string;
  student_id?: string;
  type: CalendarEventType;
  start_datetime: string;
  end_datetime?: string;
  description?: string;
  reminder_enabled: boolean;
}

export async function createEvent(dto: CreateEventDto): Promise<CalendarEvent> {
  const { data } = await api.post<CalendarEvent>("/calendar/events", dto);
  return data;
}

export interface UpdateEventDto {
  title?: string;
  type?: CalendarEventType;
  start_datetime?: string;
  end_datetime?: string;
  description?: string;
  reminder_enabled?: boolean;
}

export async function updateEvent(id: string, dto: UpdateEventDto): Promise<CalendarEvent> {
  const { data } = await api.patch<CalendarEvent>(`/calendar/events/${id}`, dto);
  return data;
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/calendar/events/${id}`);
}
