"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Phone, Mail, User } from "lucide-react";
import Link from "next/link";

interface Appointment {
  id: string;
  appointment_date: string;
  time_slot: string;
  duration_hours: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  total_price: number;
  currency: string;
  provider_id: string;
  booking_group_id: string;
}

interface Provider {
  id: string;
  name: string;
  service_type: string;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  location: string | null;
}

interface AppointmentWithProvider extends Appointment {
  provider: Provider;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please log in to view your appointments");
        setLoading(false);
        return;
      }

      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .order("appointment_date", { ascending: true })
        .order("time_slot", { ascending: true });

      if (appointmentsError) {
        console.error("Appointments error:", appointmentsError);
        throw appointmentsError;
      }

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        return;
      }

      // Get unique provider IDs
      const providerIds = [...new Set(appointmentsData.map((apt: any) => apt.provider_id))];

      // Fetch provider details
      const { data: providersData, error: providersError } = await supabase
        .from("providers")
        .select("*")
        .in("id", providerIds);

      if (providersError) {
        console.error("Providers error:", providersError);
        throw providersError;
      }

      // Create a map of providers
      const providersMap = (providersData || []).reduce((acc: any, provider: any) => {
        acc[provider.id] = provider;
        return acc;
      }, {});

      // Transform data to include provider info
      const transformedData = appointmentsData.map((apt: any) => ({
        ...apt,
        provider: providersMap[apt.provider_id] || {
          id: apt.provider_id,
          name: "Unknown Provider",
          service_type: "N/A",
          avatar_url: null,
          email: "",
          phone: null,
          location: null,
        },
      }));

      setAppointments(transformedData);
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
      setError(err.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (bookingGroupId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      setCancellingId(bookingGroupId);

      const { error: cancelError } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("booking_group_id", bookingGroupId);

      if (cancelError) throw cancelError;

      // Refresh appointments
      await fetchAppointments();
    } catch (err: any) {
      console.error("Error cancelling appointment:", err);
      setError(err.message || "Failed to cancel appointment");
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Group appointments by provider
  const groupedAppointments = appointments.reduce((acc, apt) => {
    const providerId = apt.provider_id;
    if (!acc[providerId]) {
      acc[providerId] = {
        provider: apt.provider,
        appointments: [],
      };
    }
    acc[providerId].appointments.push(apt);
    return acc;
  }, {} as Record<string, { provider: Provider; appointments: Appointment[] }>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 text-center">{error}</p>
            <Button asChild className="w-full mt-4">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
          <p className="text-muted-foreground">
            View and manage all your scheduled appointments
          </p>
        </div>

        {/* No appointments state */}
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No appointments yet</h3>
              <p className="text-muted-foreground mb-6">
                Start by browsing available providers and booking your first appointment
              </p>
              <Button asChild>
                <Link href="/providers">Browse Providers</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Appointments grouped by provider */
          <div className="space-y-8">
            {Object.values(groupedAppointments).map(({ provider, appointments }) => (
              <Card key={provider.id} className="overflow-hidden">
                {/* Provider Header */}
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={provider.avatar_url || undefined} alt={provider.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {getInitials(provider.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{provider.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{provider.service_type}</p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={`/providers/${provider.id}`}>View Profile</Link>
                    </Button>
                  </div>

                  {/* Provider Contact Info */}
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    {provider.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{provider.email}</span>
                      </div>
                    )}
                    {provider.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{provider.phone}</span>
                      </div>
                    )}
                    {provider.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{provider.location}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                {/* Appointments List */}
                <CardContent className="p-0">
                  <div className="divide-y">
                    {appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          {/* Appointment Details */}
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatDate(appointment.appointment_date)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {formatTime(appointment.time_slot)} •{" "}
                                {appointment.duration_hours === 1
                                  ? "1 hour"
                                  : `${appointment.duration_hours} hours`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={getStatusColor(appointment.status)}
                              >
                                {appointment.status.charAt(0).toUpperCase() +
                                  appointment.status.slice(1)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                ID: {appointment.booking_group_id}
                              </span>
                            </div>
                          </div>

                          {/* Price and Actions */}
                          <div className="flex flex-col items-end gap-3">
                            <div className="text-right">
                              <div className="text-2xl font-bold">
                                {appointment.total_price} {appointment.currency}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Total amount
                              </p>
                            </div>
                            {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelAppointment(appointment.booking_group_id)}
                                disabled={cancellingId === appointment.booking_group_id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              >
                                {cancellingId === appointment.booking_group_id ? "Cancelling..." : "Cancel"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
