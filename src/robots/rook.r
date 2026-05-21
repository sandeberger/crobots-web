/* rook - patrols the walls, fires at anything in front */

int dir;

main()
{
  int range;

  dir = 0;
  drive(dir, 80);

  while (1) {
    range = scan(dir, 10);
    if (range > 0 && range < 700) {
      cannon(dir, range);
    }
    range = scan(dir + 90, 10);
    if (range > 0 && range < 700) {
      cannon(dir + 90, range);
    }

    if (loc_x() > 900 || loc_y() > 900 || loc_x() < 100 || loc_y() < 100) {
      dir = (dir + 90) % 360;
      drive(dir, 80);
      while (speed() > 50)
        ;
    }
  }
}
