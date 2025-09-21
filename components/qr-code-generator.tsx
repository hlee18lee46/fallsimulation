"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface QRCodeGeneratorProps {
  hash: string
  petName: string
  vaccineType: string
  date: string
}

export function QRCodeGenerator({ hash, petName, vaccineType, date }: QRCodeGeneratorProps) {
  const [showQR, setShowQR] = useState(false)

  const verificationUrl = `${window.location.origin}/verify/${hash}`

  // Generate QR code URL using a service like qr-server.com
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verificationUrl)}`

  const downloadQR = () => {
    const link = document.createElement("a")
    link.href = qrCodeUrl
    link.download = `pawproof-${petName}-${vaccineType}-qr.png`
    link.click()
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(verificationUrl)
    // You could add a toast notification here
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z"
            />
          </svg>
          QR Code for Verification
        </CardTitle>
        <CardDescription>Generate a QR code for easy verification of this vaccination record</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="font-medium">
              {petName} - {vaccineType}
            </p>
            <p className="text-sm text-muted-foreground">{date}</p>
            <p className="text-xs font-mono text-muted-foreground">{hash}</p>
          </div>
          <Badge className="bg-primary">Valid</Badge>
        </div>

        {!showQR ? (
          <Button onClick={() => setShowQR(true)} className="w-full">
            Generate QR Code
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-lg border">
                <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code for verification" className="w-48 h-48" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Scan this QR code to verify the vaccination record</p>
              <p className="text-xs font-mono text-muted-foreground break-all">{verificationUrl}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={copyUrl} className="flex-1 bg-transparent">
                Copy URL
              </Button>
              <Button variant="outline" onClick={downloadQR} className="flex-1 bg-transparent">
                Download QR
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
