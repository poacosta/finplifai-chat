CREATE TABLE IF NOT EXISTS "uploadedDocuments" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "userId" varchar NOT NULL,
    "fileName" text NOT NULL,
    "fileType" text NOT NULL,
    "blobUrl" text NOT NULL,
    "openaiFileId" text,
    "createdAt" timestamp DEFAULT now() NOT NULL
);
