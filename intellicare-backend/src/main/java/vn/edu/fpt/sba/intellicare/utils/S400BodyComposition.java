package vn.edu.fpt.sba.intellicare.utils;

/**
* Tinh cac chi so thanh phan co the tu weight + impedance + ho so ca nhan.
* Cai can KHONG gui body fat % qua BLE — app Xiaomi Home tu tinh bang cong thuc nay.
* <p>
* Doi chieu voi du lieu that:
* nam, 21 tuoi, 160 cm
* 53.6 kg / 372.1 ohm -> 11.88 %  (app bao 11.9 %)
* 55.4 kg / 372.1 ohm -> 13.73 %  (app bao 13.5 %)
*/
public final class S400BodyComposition {

   public enum Sex {MALE, FEMALE}

   public static class Result {
       public double bmi, fatPercent, waterPercent, proteinPercent;
       public double muscleMassKg, boneMassKg, visceralFat, idealWeightKg;
       public int bmrKcalDay, metabolicAgeYears;

       @Override
       public String toString() {
           return String.format(
                   "BMI=%.1f | Fat=%.1f%% | Water=%.1f%% | Protein=%.1f%% | Muscle=%.2fkg | Bone=%.2fkg | Visceral=%.1f | BMR=%d kcal",
                   bmi, fatPercent, waterPercent, proteinPercent, muscleMassKg, boneMassKg, visceralFat, bmrKcalDay);
       }
   }

   private static double clamp(double v, double lo, double hi) {
       return v < lo ? lo : (v > hi ? hi : v);
   }

   /**
    * Lean Body Mass — nen tang cua moi cong thuc con lai.
    */
   private static double lbm(int heightCm, double weightKg, int age, double impedance) {
       double lbm = (heightCm * 9.058 / 100.0) * (heightCm / 100.0);
       lbm += weightKg * 0.32 + 12.226;
       lbm -= impedance * 0.0068;
       lbm -= age * 0.0542;
       return lbm;
   }

   private static double fatPercent(int heightCm, double weightKg, int age, Sex sex, double impedance) {
       double adjust = 0.8;
       if (sex == Sex.FEMALE) adjust = (age <= 49) ? 9.25 : 7.25;

       double coeff = 1.0;
       if (sex == Sex.MALE && weightKg < 61) {
           coeff = 0.98;
       } else if (sex == Sex.FEMALE && weightKg > 60) {
           coeff = (heightCm > 160) ? 1.03 : 0.96;
       } else if (sex == Sex.FEMALE && weightKg < 50) {
           coeff = (heightCm > 160) ? 1.03 : 1.02;
       }

       double fat = (1.0 - (((lbm(heightCm, weightKg, age, impedance) - adjust) * coeff) / weightKg)) * 100.0;
       if (fat > 63) fat = 75;
       return clamp(fat, 5, 75);
   }

   private static double waterPercent(double fatPct) {
       double water = (100.0 - fatPct) * 0.7;
       double coeff = (water <= 50) ? 1.02 : 0.98;
       if (water * coeff >= 65) water = 75;
       return clamp(water * coeff, 35, 75);
   }

   private static double boneMass(int heightCm, double weightKg, int age, double impedance, Sex sex) {
       double base = (sex == Sex.FEMALE) ? 0.245691014 : 0.18016894;
       double bone = (base - (lbm(heightCm, weightKg, age, impedance) * 0.05158)) * -1;
       bone += (bone > 2.2) ? 0.1 : -0.1;
       if (sex == Sex.FEMALE && bone > 5.1) bone = 8;
       if (sex == Sex.MALE && bone > 5.2) bone = 8;
       return clamp(bone, 0.5, 8);
   }

   private static double bmr(int heightCm, double weightKg, int age, Sex sex) {
       double bmr;
       if (sex == Sex.MALE) {
           bmr = 877.8 + weightKg * 14.916 - heightCm * 0.726 - age * 8.976;
           if (bmr > 2322) bmr = 5000;
       } else {
           bmr = 864.6 + weightKg * 10.2036 - heightCm * 0.39336 - age * 6.204;
           if (bmr > 2996) bmr = 5000;
       }
       return clamp(bmr, 500, 10000);
   }

   private static double visceralFat(int heightCm, double weightKg, int age, Sex sex) {
       double v;
       if (sex == Sex.FEMALE) {
           if (weightKg > (13 - (heightCm * 0.5)) * -1) {
               double d = ((heightCm * 1.45) + (heightCm * 0.1158) * heightCm) - 120;
               v = (weightKg * 500 / d - 6) + age * 0.07;
           } else {
               double s = 0.691 + heightCm * -0.0024 + heightCm * -0.0024;
               v = (((heightCm * 0.027) - (s * weightKg)) * -1) + age * 0.07 - age;
           }
       } else if (heightCm < weightKg * 1.6) {
           double s = ((heightCm * 0.4) - (heightCm * (heightCm * 0.0826))) * -1;
           v = ((weightKg * 305) / (s + 48)) - 2.9 + age * 0.15;
       } else {
           double s = 0.765 + heightCm * -0.0015;
           v = (((heightCm * 0.143) - (weightKg * s)) * -1) + age * 0.15 - 5.0;
       }
       return clamp(v, 1, 50);
   }

   private static double metabolicAge(int heightCm, double weightKg, int age, double impedance, Sex sex) {
       double ma = (sex == Sex.MALE)
               ? heightCm * -0.7471 + weightKg * 0.9161 + age * 0.4184 + impedance * 0.0517 + 54.2267
               : heightCm * -1.1165 + weightKg * 1.5784 + age * 0.4615 + impedance * 0.0415 + 83.2548;
       return clamp(ma, 15, 80);
   }

   public static Result compute(double weightKg, double impedanceOhm, Sex sex, int ageYears, int heightCm) {
       Result r = new Result();
       double h = heightCm / 100.0;

       r.bmi = clamp(weightKg / (h * h), 10, 90);
       r.fatPercent = fatPercent(heightCm, weightKg, ageYears, sex, impedanceOhm);
       r.waterPercent = waterPercent(r.fatPercent);
       r.boneMassKg = boneMass(heightCm, weightKg, ageYears, impedanceOhm, sex);
       r.muscleMassKg = clamp(weightKg - (r.fatPercent * 0.01 * weightKg) - r.boneMassKg, 10, 120);
       r.proteinPercent = clamp((r.muscleMassKg / weightKg) * 100.0 - r.waterPercent, 5, 32);
       r.visceralFat = visceralFat(heightCm, weightKg, ageYears, sex);
       r.bmrKcalDay = (int) Math.round(bmr(heightCm, weightKg, ageYears, sex));
       r.idealWeightKg = (sex == Sex.MALE) ? (heightCm - 80) * 0.7 : (heightCm - 70) * 0.6;
       r.metabolicAgeYears = (int) Math.round(metabolicAge(heightCm, weightKg, ageYears, impedanceOhm, sex));
       return r;
   }

   public static void main(String[] args) {
       System.out.println(compute(53.6, 372.1, Sex.MALE, 21, 160));
       System.out.println(compute(55.4, 372.1, Sex.MALE, 21, 160));
   }
}