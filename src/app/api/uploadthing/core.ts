import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  // One endpoint for every material we accept. Category (syllabus / slides /
  // notes / other) is chosen by the user in the modal and persisted alongside
  // the material row — not here.
  courseMaterial: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 1 },
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    text: { maxFileSize: "4MB", maxFileCount: 1 },
    blob: { maxFileSize: "32MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new UploadThingError("Not signed in");
      return { userId };
    })
    .onUploadComplete(({ file, metadata }) => {
      return {
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        userId: metadata.userId,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
