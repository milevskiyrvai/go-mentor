import { api } from "./client";
import type { BuddyStudent, PublicProfile, User } from "./types";

export interface UpdateSelfDto {
  display_name?: string;
  avatar_url?: string;
  about?: string;
  is_profile_private?: boolean;
}

export async function updateSelf(dto: UpdateSelfDto): Promise<User> {
  const { data } = await api.patch<User>("/me/profile", dto);
  return data;
}

export async function getPublicProfile(id: string): Promise<PublicProfile> {
  const { data } = await api.get<PublicProfile>(`/users/${id}`);
  return data;
}

export async function listMyStudents(): Promise<BuddyStudent[]> {
  const { data } = await api.get<{ items: BuddyStudent[] }>("/buddy/students");
  return data.items ?? [];
}
