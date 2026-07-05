-- AlterTable
ALTER TABLE "Institution" ADD COLUMN "level" TEXT;
ALTER TABLE "Institution" ADD COLUMN "normalizedName" TEXT;
ALTER TABLE "Institution" ADD COLUMN "ownership" TEXT;
ALTER TABLE "Institution" ADD COLUMN "sourceUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "InstitutionAlias" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "institutionId" INTEGER NOT NULL,
    "aliasName" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "institutionCode" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstitutionAlias_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "province" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "granularity" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "parserKey" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "fetchedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "parserKey" TEXT,
    "inputCount" INTEGER NOT NULL DEFAULT 0,
    "parsedCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "reportPath" TEXT,
    "errorMessage" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdmissionRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "province" TEXT NOT NULL,
    "subjectGroup" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "institutionId" INTEGER NOT NULL,
    "institutionCode" TEXT,
    "rawInstitutionName" TEXT,
    "groupCode" TEXT,
    "groupName" TEXT,
    "groupRequirement" TEXT,
    "programVariant" TEXT,
    "campusName" TEXT,
    "granularity" TEXT NOT NULL DEFAULT 'institution',
    "admissionType" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "avgScore" INTEGER,
    "minRank" INTEGER,
    "enrollmentCount" INTEGER,
    "planCount" INTEGER,
    "admittedCount" INTEGER,
    "sourceDocumentId" INTEGER,
    "sourceUrl" TEXT,
    "rawRowHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdmissionRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdmissionRecord_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AdmissionRecord" ("admissionType", "avgScore", "batch", "createdAt", "enrollmentCount", "id", "institutionId", "minRank", "minScore", "province", "subjectGroup", "updatedAt", "year") SELECT "admissionType", "avgScore", "batch", "createdAt", "enrollmentCount", "id", "institutionId", "minRank", "minScore", "province", "subjectGroup", "updatedAt", "year" FROM "AdmissionRecord";
DROP TABLE "AdmissionRecord";
ALTER TABLE "new_AdmissionRecord" RENAME TO "AdmissionRecord";
CREATE INDEX "AdmissionRecord_province_year_subjectGroup_batch_minScore_idx" ON "AdmissionRecord"("province", "year", "subjectGroup", "batch", "minScore");
CREATE INDEX "AdmissionRecord_institutionId_year_idx" ON "AdmissionRecord"("institutionId", "year");
CREATE INDEX "AdmissionRecord_institutionCode_province_year_idx" ON "AdmissionRecord"("institutionCode", "province", "year");
CREATE UNIQUE INDEX "AdmissionRecord_year_province_subjectGroup_batch_admissionType_institutionId_groupCode_programVariant_campusName_granularity_key" ON "AdmissionRecord"("year", "province", "subjectGroup", "batch", "admissionType", "institutionId", "groupCode", "programVariant", "campusName", "granularity");
CREATE TABLE "new_MajorRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "admissionRecordId" INTEGER NOT NULL,
    "sourceDocumentId" INTEGER,
    "majorName" TEXT NOT NULL,
    "majorCode" TEXT,
    "majorRequirement" TEXT,
    "minScore" INTEGER NOT NULL,
    "avgScore" INTEGER,
    "maxScore" INTEGER,
    "minRank" INTEGER,
    "majorMinRank" INTEGER,
    "enrollmentCount" INTEGER,
    "planCount" INTEGER,
    "sourceUrl" TEXT,
    "rawRowHash" TEXT,
    "granularity" TEXT NOT NULL DEFAULT 'major',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MajorRecord_admissionRecordId_fkey" FOREIGN KEY ("admissionRecordId") REFERENCES "AdmissionRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MajorRecord_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MajorRecord" ("admissionRecordId", "avgScore", "createdAt", "enrollmentCount", "id", "majorCode", "majorName", "maxScore", "minRank", "minScore", "updatedAt") SELECT "admissionRecordId", "avgScore", "createdAt", "enrollmentCount", "id", "majorCode", "majorName", "maxScore", "minRank", "minScore", "updatedAt" FROM "MajorRecord";
DROP TABLE "MajorRecord";
ALTER TABLE "new_MajorRecord" RENAME TO "MajorRecord";
CREATE INDEX "MajorRecord_admissionRecordId_minScore_idx" ON "MajorRecord"("admissionRecordId", "minScore");
CREATE INDEX "MajorRecord_majorName_idx" ON "MajorRecord"("majorName");
CREATE UNIQUE INDEX "MajorRecord_admissionRecordId_majorCode_majorName_rawRowHash_key" ON "MajorRecord"("admissionRecordId", "majorCode", "majorName", "rawRowHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "InstitutionAlias_normalizedAlias_idx" ON "InstitutionAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "InstitutionAlias_institutionCode_idx" ON "InstitutionAlias"("institutionCode");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionAlias_institutionId_aliasName_key" ON "InstitutionAlias"("institutionId", "aliasName");

-- CreateIndex
CREATE INDEX "SourceDocument_province_year_sourceType_idx" ON "SourceDocument"("province", "year", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "SourceDocument_officialUrl_sha256_key" ON "SourceDocument"("officialUrl", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");
