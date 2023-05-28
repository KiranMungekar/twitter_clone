import { clerkClient } from "@clerk/nextjs";
import type { User } from "@clerk/nextjs/dist/server";
import { Post } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const filterUsersForClient = (user: User) => {
  return {
    id: user.id, username: user.username, profilePicture: user.profileImageUrl,
  }
}

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  getAll: publicProcedure.query(async ({ ctx }) => {
    const posts = await ctx.prisma.post.findMany({
     take: 100,
    });

    const users = (await clerkClient.users.getUserList({
      userId: posts.map((post: Post) => post.authorId),
      limit: 100,
    })).map(filterUsersForClient);

    return posts.map((post) =>{
      const author = users.find((user) => user.id === post.authorId)
      if(!author || !author.username){
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Author for post not found!"
        })
      }
      return {
      post,
      author: {
        ...author,
        username: author.username
      },
      }
    });
  }),


});
