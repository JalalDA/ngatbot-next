import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { clientSecurity } from "@/lib/security-client";

export function SecurityStatus() {
  const { data: systemHealth } = useQuery({
    queryKey: ['/api/system/health'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false
  });

  const { data: securityStatus } = useQuery({
    queryKey: ['/api/system/security-status'],
    refetchInterval: 60000, // Refresh every minute
    retry: false
  });

  const clientSecurityStatus = clientSecurity.getSecurityStatus();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Client Security Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Keamanan Frontend</CardTitle>
          <Shield className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Proteksi Log</span>
              <Badge variant={clientSecurityStatus.logProtection ? "default" : "destructive"}>
                {clientSecurityStatus.logProtection ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage Protection</span>
              <Badge variant={clientSecurityStatus.storageProtection ? "default" : "destructive"}>
                {clientSecurityStatus.storageProtection ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Network Monitoring</span>
              <Badge variant={clientSecurityStatus.networkMonitoring ? "default" : "destructive"}>
                {clientSecurityStatus.networkMonitoring ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backend Security Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Keamanan Backend</CardTitle>
          <Shield className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          {securityStatus ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate Limiting</span>
                <Badge variant="default">
                  {securityStatus.protections?.rateLimiting === "enabled" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Threat Detection</span>
                <Badge variant="default">
                  {securityStatus.protections?.threatDetection === "enabled" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Log Sanitization</span>
                <Badge variant="default">
                  {securityStatus.protections?.logSanitization === "enabled" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Loading security status...
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          {systemHealth?.status === 'healthy' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          {systemHealth ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Status</span>
                <Badge variant={systemHealth.status === 'healthy' ? "default" : "secondary"}>
                  {systemHealth.status === 'healthy' ? 'Sehat' : 'Peringatan'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Operasi Aktif</span>
                <span className="text-sm font-medium">{systemHealth.activeOperations || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="text-sm font-medium">{systemHealth.successRate || '100'}%</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Loading system health...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}