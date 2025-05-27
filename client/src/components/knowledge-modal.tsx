import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKnowledgeSchema } from "@shared/schema";
import type { Knowledge } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Trash2, 
  FileText, 
  Link as LinkIcon, 
  Upload,
  Loader2,
  Edit2,
  Save,
  X
} from "lucide-react";
import { z } from "zod";

type KnowledgeFormData = z.infer<typeof insertKnowledgeSchema>;

interface KnowledgeModalProps {
  botId: number;
  onClose: () => void;
}

export function KnowledgeModal({ botId, onClose }: KnowledgeModalProps) {
  const { toast } = useToast();
  const [knowledgeType, setKnowledgeType] = useState<string>("text");
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const knowledgeForm = useForm<KnowledgeFormData>({
    resolver: zodResolver(insertKnowledgeSchema),
    defaultValues: {
      botId,
      type: "text",
      content: "",
      url: "",
      fileName: "",
    },
  });

  // Fetch knowledge for this bot
  const { data: knowledge, isLoading } = useQuery<Knowledge[]>({
    queryKey: [`/api/knowledge/${botId}`],
  });

  // Add knowledge mutation
  const addKnowledgeMutation = useMutation({
    mutationFn: async (data: KnowledgeFormData) => {
      const res = await apiRequest("POST", "/api/knowledge", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${botId}`] });
      knowledgeForm.reset({
        botId,
        type: "text",
        content: "",
        url: "",
        fileName: "",
      });
      toast({
        title: "Knowledge added",
        description: "The knowledge has been added to your bot successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update knowledge mutation
  const updateKnowledgeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: KnowledgeFormData }) => {
      const res = await apiRequest("PUT", `/api/knowledge/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${botId}`] });
      setIsEditing(false);
      setEditingKnowledge(null);
      setKnowledgeType("text");
      knowledgeForm.reset({
        botId,
        type: "text",
        content: "",
        url: "",
        fileName: "",
      });
      toast({
        title: "Knowledge updated",
        description: "The knowledge has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete knowledge mutation
  const deleteKnowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/knowledge/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${botId}`] });
      toast({
        title: "Knowledge deleted",
        description: "The knowledge has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete knowledge",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onAddKnowledge = async (data: KnowledgeFormData) => {
    const knowledgeData = {
      ...data,
      type: knowledgeType,
    };
    
    // Clear unused fields based on type
    switch (knowledgeType) {
      case "text":
        knowledgeData.url = "";
        knowledgeData.fileName = "";
        break;
      case "link":
        knowledgeData.fileName = "";
        break;
      case "file":
        knowledgeData.url = "";
        break;
    }
    
    if (isEditing && editingKnowledge) {
      // Update existing knowledge
      updateKnowledgeMutation.mutate({ id: editingKnowledge.id, data: knowledgeData });
    } else {
      // Add new knowledge
      addKnowledgeMutation.mutate(knowledgeData);
    }
  };

  const handleEditKnowledge = (knowledge: Knowledge) => {
    setEditingKnowledge(knowledge);
    setIsEditing(true);
    setKnowledgeType(knowledge.type);
    
    // Pre-fill form with existing data
    knowledgeForm.reset({
      botId: knowledge.botId,
      type: knowledge.type,
      content: knowledge.content || "",
      url: knowledge.url || "",
      fileName: knowledge.fileName || "",
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingKnowledge(null);
    setKnowledgeType("text");
    knowledgeForm.reset({
      botId,
      type: "text",
      content: "",
      url: "",
      fileName: "",
    });
  };

  const handleDeleteKnowledge = (knowledgeId: number) => {
    if (confirm("Are you sure you want to delete this knowledge item?")) {
      deleteKnowledgeMutation.mutate(knowledgeId);
    }
  };

  const getKnowledgeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      case "file":
        return <Upload className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getKnowledgeTypeColor = (type: string) => {
    switch (type) {
      case "text":
        return "bg-blue-100 text-blue-800";
      case "link":
        return "bg-green-100 text-green-800";
      case "file":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Bot Knowledge</DialogTitle>
          <DialogDescription>
            Add and manage the knowledge base for your bot to provide better responses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Knowledge Form */}
          <form onSubmit={knowledgeForm.handleSubmit(onAddKnowledge)} className="space-y-4">
            <div className="space-y-2">
              <Label>Knowledge Type</Label>
              <Select value={knowledgeType} onValueChange={setKnowledgeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select knowledge type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>Text Content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="link">
                    <div className="flex items-center space-x-2">
                      <LinkIcon className="h-4 w-4" />
                      <span>Website Link</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="file">
                    <div className="flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>File Upload (Mock)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Text Knowledge Input */}
            {knowledgeType === "text" && (
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  rows={6}
                  placeholder="Enter the knowledge content that your bot should know..."
                  {...knowledgeForm.register("content")}
                  disabled={addKnowledgeMutation.isPending}
                />
                {knowledgeForm.formState.errors.content && (
                  <p className="text-sm text-destructive">
                    {knowledgeForm.formState.errors.content.message}
                  </p>
                )}
              </div>
            )}

            {/* Link Knowledge Input */}
            {knowledgeType === "link" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    {...knowledgeForm.register("url")}
                    disabled={addKnowledgeMutation.isPending}
                  />
                  {knowledgeForm.formState.errors.url && (
                    <p className="text-sm text-destructive">
                      {knowledgeForm.formState.errors.url.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content Description</Label>
                  <Textarea
                    id="content"
                    rows={3}
                    placeholder="Describe what this website contains..."
                    {...knowledgeForm.register("content")}
                    disabled={addKnowledgeMutation.isPending}
                  />
                </div>
              </>
            )}

            {/* File Knowledge Input */}
            {knowledgeType === "file" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    placeholder="document.pdf"
                    {...knowledgeForm.register("fileName")}
                    disabled={addKnowledgeMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">File Content/Summary</Label>
                  <Textarea
                    id="content"
                    rows={4}
                    placeholder="Describe what this file contains or paste the content..."
                    {...knowledgeForm.register("content")}
                    disabled={addKnowledgeMutation.isPending}
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button 
                type="submit" 
                disabled={addKnowledgeMutation.isPending || updateKnowledgeMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {(addKnowledgeMutation.isPending || updateKnowledgeMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Knowledge
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Knowledge
                      </>
                    )}
                  </>
                )}
              </Button>
              
              {isEditing && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={addKnowledgeMutation.isPending || updateKnowledgeMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </form>

          {/* Existing Knowledge List */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Current Knowledge Base</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : !knowledge || knowledge.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No knowledge added yet. Add some knowledge above to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {knowledge.map((item) => (
                  <Card key={item.id} className="border border-slate-200">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="secondary" className={getKnowledgeTypeColor(item.type)}>
                              {getKnowledgeIcon(item.type)}
                              <span className="ml-1 capitalize">{item.type}</span>
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Added {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            {item.url && (
                              <div>
                                <span className="text-sm font-medium text-slate-700">URL: </span>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                  {item.url}
                                </a>
                              </div>
                            )}
                            {item.fileName && (
                              <div>
                                <span className="text-sm font-medium text-slate-700">File: </span>
                                <span className="text-sm text-slate-600">{item.fileName}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-sm font-medium text-slate-700">Content: </span>
                              <p className="text-sm text-slate-600 line-clamp-3">{item.content}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-1 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditKnowledge(item)}
                            disabled={deleteKnowledgeMutation.isPending}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteKnowledge(item.id)}
                            disabled={deleteKnowledgeMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {deleteKnowledgeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}