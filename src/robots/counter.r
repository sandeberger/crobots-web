/* counter - rotates scanning, fires when target detected */

main()
{
  int dir;
  int range;

  dir = 0;
  drive(90, 30);

  while (1) {
    range = scan(dir, 10);
    if (range > 0 && range < 700) {
      cannon(dir, range);
      cannon(dir, range);
    }
    dir = (dir + 15) % 360;

    if (loc_x() < 100 || loc_x() > 900 || loc_y() < 100 || loc_y() > 900) {
      drive((dir + 180) % 360, 40);
    }
  }
}
