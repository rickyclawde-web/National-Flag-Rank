import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Send, Trophy, ChevronRight, ChevronLeft } from "lucide-react";
import type { State } from "@shared/schema";

const formSchema = z.object({
  teamName: z.string().min(2, "Team name must be at least 2 characters"),
  city: z.string().min(2, "City is required"),
  clubName: z.string().optional(),
  gender: z.enum(["boys", "girls"]),
  ageGroup: z.enum(["8U", "10U", "12U", "14U"]),
  stateSlug: z.string().min(1, "Please select a state"),
  submitterName: z.string().min(2, "Your name is required"),
  submitterEmail: z.string().email("Valid email required"),
  submitterPhone: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;

const STEPS = ["Team Info", "Division", "Contact"];

export default function SubmitPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data: stateList = [] } = useQuery<State[]>({ queryKey: ["/api/states"] });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: "", city: "", clubName: "",
      gender: "boys", ageGroup: "12U", stateSlug: "",
      submitterName: "", submitterEmail: "", submitterPhone: "", notes: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: FormData) => apiRequest("POST", "/api/submissions", data),
    onSuccess: () => setSubmitted(true),
  });

  const validateStep = async (stepIndex: number) => {
    const stepFields: (keyof FormData)[][] = [
      ["teamName", "city", "stateSlug"],
      ["gender", "ageGroup"],
      ["submitterName", "submitterEmail"],
    ];
    const valid = await form.trigger(stepFields[stepIndex]);
    return valid;
  };

  const nextStep = async () => {
    const valid = await validateStep(step);
    if (valid && step < STEPS.length - 1) setStep(s => s + 1);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Nomination Submitted!</h2>
          <p className="text-muted-foreground mb-6">Your team has been added to the coach review pool. If approved, they'll be eligible for the next ranking cycle.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => { setSubmitted(false); setStep(0); form.reset(); }} variant="outline" data-testid="button-submit-another">
              Submit Another Team
            </Button>
            <Button onClick={() => window.location.href = "/"} data-testid="button-view-rankings">
              <Trophy className="w-4 h-4 mr-2" /> View Rankings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-primary px-6 py-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-primary-foreground opacity-80" />
            <span className="text-primary-foreground/80 text-sm font-medium uppercase tracking-widest">Team Nomination</span>
          </div>
          <h1 className="text-2xl font-bold text-primary-foreground">Submit Your Team</h1>
          <p className="text-primary-foreground/70 text-sm mt-1">Nominate a team to be reviewed by coaches for the monthly rankings.</p>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`} data-testid={`step-indicator-${i}`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => submitMutation.mutate(d))}>
            <Card className="border-card-border">
              <CardHeader>
                <CardTitle className="text-lg">Step {step + 1}: {STEPS[step]}</CardTitle>
                <CardDescription>
                  {step === 0 && "Tell us about the team you're nominating."}
                  {step === 1 && "Select the division for this team."}
                  {step === 2 && "Your contact information."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step === 0 && (
                  <>
                    <FormField control={form.control} name="teamName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Houston Heat" data-testid="input-team-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Houston" data-testid="input-city" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="clubName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club / Organization</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. Houston FC" data-testid="input-club-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="stateSlug" render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state-submit">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stateList.map(s => (
                              <SelectItem key={s.slug} value={s.slug} data-testid={`option-state-${s.slug}`}>{s.name} ({s.slug})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}

                {step === 1 && (
                  <>
                    <FormField control={form.control} name="gender" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Division — Gender *</FormLabel>
                        <div className="flex gap-3">
                          {["boys", "girls"].map(g => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => field.onChange(g)}
                              className={`flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-colors capitalize ${field.value === g ? "bg-primary text-primary-foreground border-primary" : "bg-card border-card-border text-foreground"}`}
                              data-testid={`option-gender-${g}`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="ageGroup" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Group *</FormLabel>
                        <div className="grid grid-cols-4 gap-3">
                          {["8U", "10U", "12U", "14U"].map(a => (
                            <button
                              key={a}
                              type="button"
                              onClick={() => field.onChange(a)}
                              className={`py-3 px-2 rounded-md border text-sm font-semibold transition-colors ${field.value === a ? "bg-primary text-primary-foreground border-primary" : "bg-card border-card-border text-foreground"}`}
                              data-testid={`option-age-${a}`}
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">
                        Selected: <span className="font-semibold text-foreground">{form.watch("gender") === "boys" ? "Boys" : "Girls"} {form.watch("ageGroup")}</span>
                      </p>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <FormField control={form.control} name="submitterName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Full Name *</FormLabel>
                        <FormControl><Input {...field} placeholder="Jane Smith" data-testid="input-submitter-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="submitterEmail" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder="you@example.com" data-testid="input-submitter-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="submitterPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl><Input {...field} type="tel" placeholder="555-1234" data-testid="input-submitter-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes</FormLabel>
                        <FormControl><Textarea {...field} placeholder="Any additional context about the team..." rows={3} data-testid="textarea-notes" /></FormControl>
                        <FormDescription>Optional — tell us why this team should be ranked.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3 mt-4 justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 0}
                data-testid="button-prev-step"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep} data-testid="button-next-step">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitMutation.isPending} data-testid="button-submit-form">
                  {submitMutation.isPending ? "Submitting…" : <><Send className="w-4 h-4 mr-2" /> Submit Nomination</>}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
