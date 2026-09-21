-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "twtUser" TEXT NOT NULL,
    "yumeshipName" TEXT NOT NULL,
    "oshiName" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "yumeTypeReceive" TEXT NOT NULL,
    "fandomYume" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "languageGive" TEXT,
    "languageReceive" TEXT,
    "fandomGive" TEXT,
    "yumeTypeGive" TEXT,
    "yumeDocuLink" TEXT,
    "notes" TEXT,
    "folderLink" TEXT,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seed" INTEGER,
    "totalParticipants" INTEGER NOT NULL,
    "matchedPairs" INTEGER NOT NULL,

    CONSTRAINT "MatchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchRunId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participant_email_key" ON "Participant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchRunId_giverId_key" ON "Match"("matchRunId", "giverId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_matchRunId_fkey" FOREIGN KEY ("matchRunId") REFERENCES "MatchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
