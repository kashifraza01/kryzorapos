<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('user');
        
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json($query->orderByDesc('clock_in')->get());
    }

    public function clockIn(Request $request)
    {
        $user = $request->user();
        
        // Check if already clocked in today
        $existing = Attendance::where('user_id', $user->id)
            ->whereNull('clock_out')
            ->first();
            
        if ($existing) {
            return response()->json(['message' => 'Already clocked in'], 400);
        }

        $attendance = Attendance::create([
            'user_id' => $user->id,
            'clock_in' => now(),
            'status' => 'present'
        ]);

        return response()->json($attendance);
    }

    public function clockOut(Request $request)
    {
        $user = $request->user();
        
        $attendance = Attendance::where('user_id', $user->id)
            ->whereNull('clock_out')
            ->first();
            
        if (!$attendance) {
            return response()->json(['message' => 'Not clocked in'], 400);
        }

        $clockOut = now();
        $clockIn = Carbon::parse($attendance->clock_in);
        // Better logical precision: calculate in minutes and convert to decimal hours
        $totalMinutes = $clockIn->diffInMinutes($clockOut);
        $totalHours = round($totalMinutes / 60, 2);

        $attendance->update([
            'clock_out' => $clockOut,
            'total_hours' => $totalHours
        ]);

        return response()->json($attendance);
    }

    public function status(Request $request)
    {
        $attendance = Attendance::where('user_id', $request->user()->id)
            ->whereNull('clock_out')
            ->first();
            
        return response()->json(['is_clocked_in' => !!$attendance, 'attendance' => $attendance]);
    }
}
