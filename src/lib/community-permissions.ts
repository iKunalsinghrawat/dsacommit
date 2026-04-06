import { Role } from "@/generated/prisma/enums";

type CommunityActor = {
  id: string;
  role: Role;
};

type CommunityPostOwnership = {
  authorId: string;
};

export function canEditCommunityPost(user: CommunityActor, post: CommunityPostOwnership) {
  return user.id === post.authorId;
}

export function canDeleteCommunityPost(user: CommunityActor, post: CommunityPostOwnership) {
  return user.id === post.authorId || user.role === Role.ADMIN;
}
