-- AlterTable
ALTER TABLE "Institution" ADD COLUMN "hkCategory" TEXT;
ALTER TABLE "Institution" ADD COLUMN "region" TEXT;

-- CreateTable
CREATE TABLE "AssociateDegreeRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examCategory" TEXT NOT NULL DEFAULT 'gaokao',
    "recordIdentityKey" TEXT,
    "year" INTEGER NOT NULL,
    "institutionId" INTEGER NOT NULL,
    "programmeName" TEXT NOT NULL,
    "programmeCode" TEXT,
    "programmeCategory" TEXT,
    "admissionRequirement" TEXT,
    "minScore" REAL,
    "medianScore" REAL,
    "maxScore" REAL,
    "gaokaoRequirement" TEXT,
    "ieltsRequirement" REAL,
    "interviewRequired" BOOLEAN,
    "quota" INTEGER,
    "remarks" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssociateDegreeRecord_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExamFramework" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examCategory" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scoreMode" TEXT NOT NULL,
    "subjectRequirementMode" TEXT NOT NULL,
    "officialSourceFeasibility" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ExamRequirementTemplate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examFrameworkId" INTEGER NOT NULL,
    "institutionName" TEXT,
    "programName" TEXT,
    "requirementText" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExamRequirementTemplate_examFrameworkId_fkey" FOREIGN KEY ("examFrameworkId") REFERENCES "ExamFramework" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchSourceDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examCategory" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "officialUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceScope" TEXT NOT NULL DEFAULT 'research',
    "fetchedAt" DATETIME,
    "localPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AdmissionRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examCategory" TEXT NOT NULL DEFAULT 'gaokao',
    "recordIdentityKey" TEXT,
    "isSyntheticParent" BOOLEAN NOT NULL DEFAULT false,
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
    "degreeLevel" TEXT,
    "programmeName" TEXT,
    "facultyName" TEXT,
    "minScore" INTEGER NOT NULL,
    "avgScore" INTEGER,
    "uqScore" REAL,
    "medianScore" REAL,
    "lqScore" REAL,
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
INSERT INTO "new_AdmissionRecord" ("admissionType", "admittedCount", "avgScore", "batch", "campusName", "createdAt", "enrollmentCount", "granularity", "groupCode", "groupName", "groupRequirement", "id", "institutionCode", "institutionId", "minRank", "minScore", "planCount", "programVariant", "province", "rawInstitutionName", "rawRowHash", "sourceDocumentId", "sourceUrl", "subjectGroup", "updatedAt", "year") SELECT "admissionType", "admittedCount", "avgScore", "batch", "campusName", "createdAt", "enrollmentCount", "granularity", "groupCode", "groupName", "groupRequirement", "id", "institutionCode", "institutionId", "minRank", "minScore", "planCount", "programVariant", "province", "rawInstitutionName", "rawRowHash", "sourceDocumentId", "sourceUrl", "subjectGroup", "updatedAt", "year" FROM "AdmissionRecord";
DROP TABLE "AdmissionRecord";
ALTER TABLE "new_AdmissionRecord" RENAME TO "AdmissionRecord";
CREATE UNIQUE INDEX "AdmissionRecord_recordIdentityKey_key" ON "AdmissionRecord"("recordIdentityKey");
CREATE INDEX "AdmissionRecord_province_year_subjectGroup_batch_minScore_idx" ON "AdmissionRecord"("province", "year", "subjectGroup", "batch", "minScore");
CREATE INDEX "AdmissionRecord_institutionId_year_idx" ON "AdmissionRecord"("institutionId", "year");
CREATE INDEX "AdmissionRecord_institutionCode_province_year_idx" ON "AdmissionRecord"("institutionCode", "province", "year");
CREATE INDEX "AdmissionRecord_createdAt_idx" ON "AdmissionRecord"("createdAt");
CREATE UNIQUE INDEX "AdmissionRecord_year_province_subjectGroup_batch_admissionType_institutionId_groupCode_programVariant_campusName_granularity_key" ON "AdmissionRecord"("year", "province", "subjectGroup", "batch", "admissionType", "institutionId", "groupCode", "programVariant", "campusName", "granularity");
CREATE TABLE "new_MajorRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "examCategory" TEXT NOT NULL DEFAULT 'gaokao',
    "majorIdentityKey" TEXT,
    "sourceLevel" TEXT,
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
INSERT INTO "new_MajorRecord" ("admissionRecordId", "avgScore", "createdAt", "enrollmentCount", "granularity", "id", "majorCode", "majorMinRank", "majorName", "majorRequirement", "maxScore", "minRank", "minScore", "planCount", "rawRowHash", "sourceDocumentId", "sourceUrl", "updatedAt") SELECT "admissionRecordId", "avgScore", "createdAt", "enrollmentCount", "granularity", "id", "majorCode", "majorMinRank", "majorName", "majorRequirement", "maxScore", "minRank", "minScore", "planCount", "rawRowHash", "sourceDocumentId", "sourceUrl", "updatedAt" FROM "MajorRecord";
DROP TABLE "MajorRecord";
ALTER TABLE "new_MajorRecord" RENAME TO "MajorRecord";
CREATE UNIQUE INDEX "MajorRecord_majorIdentityKey_key" ON "MajorRecord"("majorIdentityKey");
CREATE INDEX "MajorRecord_admissionRecordId_minScore_idx" ON "MajorRecord"("admissionRecordId", "minScore");
CREATE INDEX "MajorRecord_majorName_idx" ON "MajorRecord"("majorName");
CREATE TABLE "new_SourceDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" TEXT,
    "examCategory" TEXT NOT NULL DEFAULT 'gaokao',
    "sourceScope" TEXT NOT NULL DEFAULT 'ingest',
    "sourceLevel" TEXT,
    "schoolKey" TEXT,
    "institutionId" INTEGER,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SourceDocument_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SourceDocument" ("createdAt", "fetchedAt", "granularity", "id", "localPath", "officialUrl", "parserKey", "parserVersion", "province", "sha256", "sourceType", "title", "updatedAt", "year") SELECT "createdAt", "fetchedAt", "granularity", "id", "localPath", "officialUrl", "parserKey", "parserVersion", "province", "sha256", "sourceType", "title", "updatedAt", "year" FROM "SourceDocument";
DROP TABLE "SourceDocument";
ALTER TABLE "new_SourceDocument" RENAME TO "SourceDocument";
CREATE INDEX "SourceDocument_province_year_sourceType_idx" ON "SourceDocument"("province", "year", "sourceType");
CREATE UNIQUE INDEX "SourceDocument_officialUrl_sha256_key" ON "SourceDocument"("officialUrl", "sha256");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AssociateDegreeRecord_recordIdentityKey_key" ON "AssociateDegreeRecord"("recordIdentityKey");

-- CreateIndex
CREATE INDEX "AssociateDegreeRecord_institutionId_year_idx" ON "AssociateDegreeRecord"("institutionId", "year");

-- CreateIndex
CREATE INDEX "AssociateDegreeRecord_examCategory_year_idx" ON "AssociateDegreeRecord"("examCategory", "year");

-- CreateIndex
CREATE UNIQUE INDEX "ExamFramework_key_key" ON "ExamFramework"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSourceDocument_officialUrl_key" ON "ResearchSourceDocument"("officialUrl");
