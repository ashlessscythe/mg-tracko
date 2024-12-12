-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER_SERVICE', 'WAREHOUSE', 'REPORT_RUNNER', 'PENDING');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'LOADING', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MustGoRequest" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "plant" TEXT,
    "palletCount" INTEGER NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "routeInfo" TEXT,
    "additionalNotes" TEXT,
    "notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MustGoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trailer" (
    "id" TEXT NOT NULL,
    "trailerNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestTrailer" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "trailerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestTrailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartDetail" (
    "id" TEXT NOT NULL,
    "partNumber" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "trailerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL,
    "mustGoRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MustGoRequest_createdBy_idx" ON "MustGoRequest"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_trailerNumber_key" ON "Trailer"("trailerNumber");

-- CreateIndex
CREATE INDEX "RequestTrailer_requestId_idx" ON "RequestTrailer"("requestId");

-- CreateIndex
CREATE INDEX "RequestTrailer_trailerId_idx" ON "RequestTrailer"("trailerId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestTrailer_requestId_trailerId_key" ON "RequestTrailer"("requestId", "trailerId");

-- CreateIndex
CREATE INDEX "PartDetail_requestId_idx" ON "PartDetail"("requestId");

-- CreateIndex
CREATE INDEX "PartDetail_trailerId_idx" ON "PartDetail"("trailerId");

-- CreateIndex
CREATE UNIQUE INDEX "PartDetail_partNumber_requestId_trailerId_key" ON "PartDetail"("partNumber", "requestId", "trailerId");

-- CreateIndex
CREATE INDEX "RequestLog_mustGoRequestId_idx" ON "RequestLog"("mustGoRequestId");

-- CreateIndex
CREATE INDEX "RequestLog_performedBy_idx" ON "RequestLog"("performedBy");

-- AddForeignKey
ALTER TABLE "MustGoRequest" ADD CONSTRAINT "MustGoRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTrailer" ADD CONSTRAINT "RequestTrailer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MustGoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTrailer" ADD CONSTRAINT "RequestTrailer_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDetail" ADD CONSTRAINT "PartDetail_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "MustGoRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartDetail" ADD CONSTRAINT "PartDetail_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_mustGoRequestId_fkey" FOREIGN KEY ("mustGoRequestId") REFERENCES "MustGoRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLog" ADD CONSTRAINT "RequestLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
