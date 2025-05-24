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
  Package,
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
      productName: "",
      productPrice: "",
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
        productName: "",
        productPrice: "",
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
      knowledgeForm.reset({
        botId,
        type: "text",
        content: "",
        url: "",
        fileName: "",
        productName: "",
        productPrice: "",
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
    mutationFn: async (knowledgeId: number) => {
      const res = await apiRequest("DELETE", `/api/knowledge/${knowledgeId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/knowledge/${botId}`] });
      toast({
        title: "Knowledge deleted",
        description: "The knowledge item has been removed from your bot.",
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
        knowledgeData.productName = "";
        knowledgeData.productPrice = "";
        break;
      case "link":
        knowledgeData.fileName = "";
        knowledgeData.productName = "";
        knowledgeData.productPrice = "";
        break;
      case "file":
        knowledgeData.url = "";
        knowledgeData.productName = "";
        knowledgeData.productPrice = "";
        break;
      case "product":
        knowledgeData.url = "";
        knowledgeData.fileName = "";
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
      productName: knowledge.productName || "",
      productPrice: knowledge.productPrice || "",
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
      productName: "",
      productPrice: "",
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
      case "product":
        return <Package className="h-4 w-4" />;
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
      case "product":
        return "bg-orange-100 text-orange-800";
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
          {/* Add Knowledge Form */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Knowledge</h3>
            
            <form onSubmit={knowledgeForm.handleSubmit(onAddKnowledge)} className="space-y-4">
              <div className="space-y-2">
                <Label>Knowledge Type</Label>
                <Select value={knowledgeType} onValueChange={setKnowledgeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select knowledge type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="link">Website Link</SelectItem>
                    <SelectItem value="file">File Upload (Mock)</SelectItem>
                    <SelectItem value="product">Product Information</SelectItem>
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

              {/* File Upload (Mock) */}
              {knowledgeType === "file" && (
                <>
                  <div className="space-y-2">
                    <Label>File Upload (Mock)</Label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                      <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">File upload feature coming soon</p>
                      <p className="text-sm text-slate-500 mt-1">For now, please use text content</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">File Content</Label>
                    <Textarea
                      id="content"
                      rows={4}
                      placeholder="Paste the file content here for now..."
                      {...knowledgeForm.register("content")}
                      disabled={addKnowledgeMutation.isPending}
                    />
                  </div>
                </>
              )}

              {/* Product Information */}
              {knowledgeType === "product" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      placeholder="Enter product name"
                      {...knowledgeForm.register("productName")}
                      disabled={addKnowledgeMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Product Description</Label>
                    <Textarea
                      id="content"
                      rows={4}
                      placeholder="Describe the product features, benefits, etc..."
                      {...knowledgeForm.register("content")}
                      disabled={addKnowledgeMutation.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productPrice">Price</Label>
                    <Input
                      id="productPrice"
                      placeholder="e.g., $99.99"
                      {...knowledgeForm.register("productPrice")}
                      disabled={addKnowledgeMutation.isPending}
                    />
                  </div>
                </>
              )}

              <Button 
                type="submit" 
                disabled={addKnowledgeMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {addKnowledgeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Knowledge
                  </>
                )}
              </Button>
            </form>
          </div>

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
                          
                          {item.type === "product" && item.productName && (
                            <h4 className="font-medium text-slate-900 mb-1">{item.productName}</h4>
                          )}
                          
                          {item.type === "link" && item.url && (
                            <p className="text-sm text-primary mb-1">{item.url}</p>
                          )}
                          
                          {item.type === "file" && item.fileName && (
                            <p className="text-sm text-slate-600 mb-1">File: {item.fileName}</p>
                          )}
                          
                          <p className="text-sm text-slate-700 line-clamp-3">
                            {item.content}
                          </p>
                          
                          {item.type === "product" && item.productPrice && (
                            <p className="text-sm font-medium text-green-600 mt-1">
                              Price: {item.productPrice}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKnowledge(item.id)}
                          disabled={deleteKnowledgeMutation.isPending}
                          className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
