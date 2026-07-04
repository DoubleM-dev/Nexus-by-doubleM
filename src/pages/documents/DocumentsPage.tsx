import React, { useState, useEffect, useRef, useCallback } from "react";
import { FileText, Upload, Download, Trash2, Share2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface Document {
  id: number;
  name: string;
  file_url: string;
  file_type: string;
  file_size: string;
  is_shared: boolean;
  status: string;
  created_at: string;
}

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = localStorage.getItem("business_nexus_token");

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        fetchDocuments();
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`${API_URL}/documents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Delete error", err);
    }
  }

  async function handleShare(id: number) {
    const input = prompt("Enter user ID to share with:");
    if (!input) return;

    const user_ids = input.split(",").map((s) => s.trim());

    try {
      const res = await fetch(`${API_URL}/documents/${id}/share`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_ids }),
      });
      if (res.ok) {
        fetchDocuments();
        alert("Document shared successfully");
      }
    } catch (err) {
      console.error("Share error", err);
    }
  }

  function handleDownload(doc: Document) {
    const url = `http://localhost:5000${doc.file_url}`;
    window.open(url, "_blank");
  }

  function getFileType(mimeType: string) {
    if (mimeType?.includes("pdf")) return "PDF";
    if (mimeType?.includes("word")) return "Document";
    if (mimeType?.includes("sheet") || mimeType?.includes("excel"))
      return "Spreadsheet";
    if (mimeType?.includes("image")) return "Image";
    return "File";
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toISOString().split("T")[0];
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />
          <Button
            leftIcon={<Upload size={18} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Storage</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Files</span>
                <span className="font-medium text-gray-900">
                  {documents.length}
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-primary-600 rounded-full"
                  style={{ width: `${Math.min(documents.length * 10, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Quick Access
              </h3>
              <div className="space-y-2">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  onClick={fetchDocuments}
                >
                  All Files
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  onClick={async () => {
                    const res = await fetch(`${API_URL}/documents/shared`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    setDocuments(data);
                  }}
                >
                  Shared with Me
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                All Documents
              </h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Loading documents...
                </p>
              ) : documents.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No documents yet. Upload your first file.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <div className="p-2 bg-primary-50 rounded-lg mr-4">
                        <FileText size={24} className="text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </h3>
                          {doc.is_shared && (
                            <Badge variant="secondary" size="sm">
                              Shared
                            </Badge>
                          )}
                          <Badge variant="primary" size="sm">
                            {doc.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{getFileType(doc.file_type)}</span>
                          <span>{doc.file_size}</span>
                          <span>Uploaded {formatDate(doc.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          aria-label="Download"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download size={18} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          aria-label="Share"
                          onClick={() => handleShare(doc.id)}
                        >
                          <Share2 size={18} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 text-error-600 hover:text-error-700"
                          aria-label="Delete"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
