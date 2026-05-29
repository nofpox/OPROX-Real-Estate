import { useState, useRef } from "react";
  import { useParams, useLocation } from "wouter";
  import { useQuery, useMutation } from "@tanstack/react-query";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Textarea } from "@/components/ui/textarea";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Badge } from "@/components/ui/badge";
  import { Skeleton } from "@/components/ui/skeleton";
  import { useToast } from "@/hooks/use-toast";
  import {
    Building2, ArrowLeft, Zap, Droplets, Wind, Brush, Volume2, Users,
    DoorOpen, CheckCircle2, Star, Loader2, AlertCircle, Calendar, DollarSign,
    Camera, X,
  } from "lucide-react";

  const API = "/api";

  type Room = { id: number; name: string; type: string; status: string; pricePerNight: number };
  type Financial = { status: string; dueDate: string | null; amountDue: number | null; checkIn: string | null; checkOut: string | null };

  const REQUEST_TYPES = [
    { value: "electrical", label: "Electrical Issue", icon: Zap, color: "text-yellow-600" },
    { value: "plumbing", label: "Plumbing Issue", icon: Droplets, color: "text-blue-600" },
    { value: "ac", label: "AC / Heating", icon: Wind, color: "text-cyan-600" },
    { value: "cleaning", label: "Cleaning", icon: Brush, color: "text-green-600" },
    { value: "noise", label: "Noise Complaint", icon: Volume2, color: "text-orange-600" },
    { value: "visitor", label: "Visitor Registration", icon: Users, color: "text-purple-600" },
    { value: "other", label: "Other", icon: DoorOpen, color: "text-slate-600" },
  ];

  const STATUS_BADGE: Record<string, string> = {
    occupied: "bg-blue-100 text-blue-800 border-blue-200",
    available: "bg-green-100 text-green-800 border-green-200",
    maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  };

  const TABS = ["request", "financial", "feedback"] as const;
  type Tab = typeof TABS[number];

  const formatDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const formatCurrency = (v: number | null) => v != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v) : "—";

  export default function UnitPortal() {
    const params = useParams<{ id: string }>();
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const roomId = Number(params.id);
    const [activeTab, setActiveTab] = useState<Tab>("request");
    const [reqType, setReqType] = useState("");
    const [reqDesc, setReqDesc] = useState("");
    const [photoBase64, setPhotoBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitted, setSubmitted] = useState<"request" | "feedback" | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setPhotoBase64(reader.result as string);
      reader.readAsDataURL(file);
    };

    const clearPhoto = () => {
      setPhotoBase64(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const { data: room, isLoading: roomLoading, isError: roomError } = useQuery<Room>({
      queryKey: ["room", roomId],
      queryFn: () => fetch(`${API}/rooms/${roomId}`).then(r => { if (!r.ok) throw new Error("Room not found"); return r.json(); }),
      enabled: !!roomId && !isNaN(roomId),
    });

    const { data: financial } = useQuery<Financial>({
      queryKey: ["financial", roomId],
      queryFn: () => fetch(`${API}/unit-financials/${roomId}`).then(r => r.ok ? r.json() : null),
      enabled: !!roomId && !isNaN(roomId),
    });

    const buildDescription = () => {
      const text = reqDesc.trim();
      if (photoBase64) return text ? `${text}\n\n[PHOTO]:${photoBase64}` : `[PHOTO]:${photoBase64}`;
      return text;
    };

    const requestMutation = useMutation({
      mutationFn: () => fetch(`${API}/guest/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, type: reqType, description: buildDescription() }),
      }).then(r => { if (!r.ok) throw new Error("Submission failed"); return r.json(); }),
      onSuccess: () => {
        toast({ title: "Request submitted! We'll be in touch shortly." });
        setSubmitted("request"); setReqType(""); setReqDesc(""); clearPhoto();
      },
      onError: () => toast({ title: "Failed to submit request. Please try again.", variant: "destructive" }),
    });

    const feedbackMutation = useMutation({
      mutationFn: () => fetch(`${API}/guest/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, rating: String(rating), comment }),
      }).then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); }),
      onSuccess: () => {
        toast({ title: "Thank you for your feedback!" });
        setSubmitted("feedback"); setRating(0); setComment("");
      },
      onError: () => toast({ title: "Failed to submit feedback. Please try again.", variant: "destructive" }),
    });

    if (isNaN(roomId)) return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto text-destructive mb-2" size={32} />
          <p className="text-foreground font-semibold">Invalid unit number</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Go Back</Button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-background pb-8">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-border/50 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-amber-500" />
            <span className="font-semibold text-sm text-foreground">Grand PMS</span>
          </div>
        </div>

        {/* Unit header */}
        <div className="px-6 pt-6 pb-4">
          {roomLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          ) : roomError ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-destructive mb-2" size={32} />
              <p className="font-semibold">Unit not found</p>
              <p className="text-sm text-muted-foreground mt-1">Please check the unit number and try again.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Go Back</Button>
            </div>
          ) : room ? (
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground">{room.name}</h2>
                <p className="text-muted-foreground text-sm mt-0.5">{room.type} Unit</p>
              </div>
              <Badge className={`${STATUS_BADGE[room.status] || "bg-slate-100 text-slate-700"} border text-xs font-semibold capitalize`}>
                {room.status}
              </Badge>
            </div>
          ) : null}
        </div>

        {/* Tab buttons */}
        {room && (
          <div className="px-6">
            <div className="flex gap-1 bg-muted rounded-xl p-1">
              {([["request", "Submit Request"], ["financial", "Financials"], ["feedback", "Feedback"]] as [Tab, string][]).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab content */}
        {room && (
          <div className="px-6 mt-4">
            {/* Submit Request */}
            {activeTab === "request" && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Submit a Service Request</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submitted === "request" ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="mx-auto text-green-500 mb-3" size={44} />
                      <p className="font-semibold text-lg">Request Submitted!</p>
                      <p className="text-sm text-muted-foreground mt-1">Our team will respond promptly.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setSubmitted(null)}>Submit Another</Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-2 text-foreground">Request Type</p>
                        <div className="grid grid-cols-2 gap-2">
                          {REQUEST_TYPES.map(({ value, label, icon: Icon, color }) => (
                            <button
                              key={value}
                              onClick={() => setReqType(value)}
                              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${reqType === value ? "border-amber-500 bg-amber-50" : "border-border hover:border-amber-300 bg-white"}`}
                            >
                              <Icon size={16} className={color} />
                              <span className="text-xs font-medium text-foreground">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 text-foreground">Description</p>
                        <Textarea
                          placeholder="Describe the issue in detail…"
                          rows={3}
                          value={reqDesc}
                          onChange={(e) => setReqDesc(e.target.value)}
                          className="resize-none"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 text-foreground">Attach Photo <span className="text-muted-foreground font-normal">(optional)</span></p>
                        {photoBase64 ? (
                          <div className="relative w-full rounded-xl overflow-hidden border border-border">
                            <img src={photoBase64} alt="Attached" className="w-full max-h-48 object-cover" />
                            <button
                              type="button"
                              onClick={clearPhoto}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-amber-400 bg-muted/30 hover:bg-amber-50/50 cursor-pointer transition-colors">
                            <Camera size={20} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Take photo or choose from gallery</span>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        )}
                      </div>
                      <Button
                        onClick={() => requestMutation.mutate()}
                        disabled={!reqType || (reqDesc.trim().length < 5 && !photoBase64) || requestMutation.isPending}
                        className="w-full h-11 font-semibold bg-amber-500 hover:bg-amber-600 text-black"
                      >
                        {requestMutation.isPending ? <><Loader2 className="animate-spin mr-2" size={16} />Submitting…</> : "Submit Request"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial Details */}
            {activeTab === "financial" && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Unit Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {financial ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Status", value: <Badge className="capitalize">{financial.status || "—"}</Badge>, icon: null },
                          { label: "Amount Due", value: formatCurrency(financial.amountDue), icon: DollarSign },
                          { label: "Due Date", value: formatDate(financial.dueDate), icon: Calendar },
                          { label: "Check-In", value: formatDate(financial.checkIn), icon: Calendar },
                          { label: "Check-Out", value: formatDate(financial.checkOut), icon: Calendar },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label} className="bg-muted/50 rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className="font-semibold text-sm text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">Contact management for billing inquiries.</p>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="mx-auto mb-2 opacity-40" size={32} />
                      <p className="text-sm">No financial data available for this unit.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Feedback */}
            {activeTab === "feedback" && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Rate Your Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {submitted === "feedback" ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="mx-auto text-green-500 mb-3" size={44} />
                      <p className="font-semibold text-lg">Thank you!</p>
                      <p className="text-sm text-muted-foreground mt-1">Your feedback helps us improve.</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-3 text-center text-foreground">How would you rate your stay?</p>
                        <div className="flex justify-center gap-3">
                          {[1,2,3,4,5].map(n => (
                            <button
                              key={n}
                              onClick={() => setRating(n)}
                              onMouseEnter={() => setHoverRating(n)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform active:scale-90"
                            >
                              <Star size={36} className={(hoverRating || rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"} />
                            </button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <p className="text-center text-sm text-muted-foreground mt-2">
                            {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2 text-foreground">Comments (optional)</p>
                        <Textarea
                          placeholder="Tell us about your experience…"
                          rows={3}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="resize-none"
                        />
                      </div>
                      <Button
                        onClick={() => feedbackMutation.mutate()}
                        disabled={rating === 0 || feedbackMutation.isPending}
                        className="w-full h-11 font-semibold bg-amber-500 hover:bg-amber-600 text-black"
                      >
                        {feedbackMutation.isPending ? <><Loader2 className="animate-spin mr-2" size={16} />Submitting…</> : "Submit Feedback"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }
  