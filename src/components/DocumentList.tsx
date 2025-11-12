import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listDocuments } from "@/lib/gemini-api";
import { handleError, showLoading, dismissToast } from "@/lib/error-handler";
import type { FileSearchDocument } from "@/types/gemini";
import { RefreshCw } from "lucide-react";

interface DocumentListProps {
  storeName?: string;
}

export default function DocumentList({ storeName }: DocumentListProps) {
  const [documents, setDocuments] = useState<FileSearchDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadDocuments = async () => {
    if (!storeName) return;

    setIsLoading(true);
    const toastId = showLoading('ドキュメント一覧を読み込み中...');

    try {
      const docs = await listDocuments(storeName);
      dismissToast(toastId);
      setDocuments(docs);
    } catch (error) {
      dismissToast(toastId);
      handleError(error, 'ドキュメント一覧の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [storeName]);

  const getStateColor = (state?: string) => {
    switch (state) {
      case 'SUCCEEDED':
        return 'default';
      case 'PROCESSING':
        return 'secondary';
      case 'FAILED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ja-JP');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ドキュメント一覧</CardTitle>
            <CardDescription>
              ファイル検索ストアに格納されているドキュメント
            </CardDescription>
          </div>
          <Button
            onClick={loadDocuments}
            disabled={!storeName || isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!storeName ? (
          <p className="text-sm text-muted-foreground">
            先にストアを作成してください
          </p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            ドキュメントがありません
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ドキュメント名</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>作成日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.name}>
                  <TableCell className="font-medium">
                    {doc.displayName || doc.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStateColor(doc.state)}>
                      {doc.state || 'UNKNOWN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.createTime)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
