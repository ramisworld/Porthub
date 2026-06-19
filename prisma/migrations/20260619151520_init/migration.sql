-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "githubUsername" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vibe" TEXT NOT NULL,
    "profileData" JSONB NOT NULL,
    "code" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "customDomain" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubCache" (
    "username" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubCache_pkey" PRIMARY KEY ("username")
);

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_slug_key" ON "Portfolio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_customDomain_key" ON "Portfolio"("customDomain");

-- CreateIndex
CREATE INDEX "Portfolio_githubUsername_idx" ON "Portfolio"("githubUsername");

-- CreateIndex
CREATE INDEX "Portfolio_ownerId_idx" ON "Portfolio"("ownerId");
