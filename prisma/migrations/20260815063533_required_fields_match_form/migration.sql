/*
  Warnings:

  - Made the column `languageReceive` on table `Participant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fandomGive` on table `Participant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `yumeTypeGive` on table `Participant` required. This step will fail if there are existing NULL values in that column.
  - Made the column `yumeDocuLink` on table `Participant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Participant" ALTER COLUMN "yumeTypeReceive" DROP NOT NULL,
ALTER COLUMN "languageReceive" SET NOT NULL,
ALTER COLUMN "fandomGive" SET NOT NULL,
ALTER COLUMN "yumeTypeGive" SET NOT NULL,
ALTER COLUMN "yumeDocuLink" SET NOT NULL;
