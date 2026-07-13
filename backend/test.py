# if you have shell/python access to the CSV

import sys; 
sys.path.append('.'); 
from src.portfolio import run_stress_test; print(run_stress_test('Manufacturing', 'leverage_surge', 0.20))